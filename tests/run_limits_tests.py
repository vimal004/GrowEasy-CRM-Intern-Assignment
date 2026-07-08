#!/usr/bin/env python3
import urllib.request
import urllib.error
import json
import uuid
import sys
import time
import ssl

# Bypass SSL certificate verification
ssl._create_default_https_context = ssl._create_unverified_context

BASE_URL = "https://groweasy-crm-api.onrender.com/api"

GREEN = '\033[0;32m'
RED = '\033[0;31m'w
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
BOLD = '\033[1m'
NC = '\033[0m'

pass_count = 0
fail_count = 0
log_lines = []

def log(level, message):
    global pass_count, fail_count, log_lines
    prefix = ""
    colored = ""
    if level == "PASS":
        prefix = "✅ PASS"
        colored = f"{GREEN}{prefix}{NC}: {message}"
        pass_count += 1
    elif level == "FAIL":
        prefix = "❌ FAIL"
        colored = f"{RED}{prefix}{NC}: {message}"
        fail_count += 1
    elif level == "INFO":
        prefix = "ℹ️  INFO"
        colored = f"{BLUE}{prefix}{NC}: {message}"
    elif level == "SECTION":
        colored = f"\n{CYAN}{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{NC}\n{CYAN}{BOLD} {message}{NC}\n{CYAN}{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{NC}"
    
    print(colored)
    clean_msg = colored.replace(GREEN, "").replace(RED, "").replace(YELLOW, "").replace(BLUE, "").replace(CYAN, "").replace(BOLD, "").replace(NC, "")
    log_lines.append(clean_msg)

def send_multipart_request(url, fields, file_name, file_content_bytes):
    boundary = uuid.uuid4().hex
    CRLF = b'\r\n'
    body = bytearray()
    
    for key, value in fields.items():
        body.extend(f'--{boundary}'.encode('utf-8') + CRLF)
        body.extend(f'Content-Disposition: form-data; name="{key}"'.encode('utf-8') + CRLF)
        body.extend(CRLF)
        body.extend(str(value).encode('utf-8') + CRLF)
        
    body.extend(f'--{boundary}'.encode('utf-8') + CRLF)
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{file_name}"'.encode('utf-8') + CRLF)
    body.extend(b'Content-Type: text/csv' + CRLF)
    body.extend(CRLF)
    body.extend(file_content_bytes)
    body.extend(CRLF)
    
    body.extend(f'--{boundary}--'.encode('utf-8') + CRLF)
    body.extend(CRLF)
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body))
    }
    
    req = urllib.request.Request(url, headers=headers, method="POST", data=bytes(body))
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

def run_limit_tests():
    log("SECTION", "TEST GROUP: FILE SIZE & RECORD COUNT GUARDS")

    # 1. Test 5MB Size Limit (HTTP 413)
    # Generate in-memory file of 5.1 MB (5,347,737 bytes)
    # 5.1 * 1024 * 1024 = 5,347,737.6
    size_5_1_mb = int(5.1 * 1024 * 1024)
    log("INFO", f"Generating 5.1MB mock CSV content in-memory ({size_5_1_mb} bytes)...")
    large_csv_bytes = b"created_at,name,email,mobile_without_country_code\n" + b"X" * (size_5_1_mb - 50)
    
    log("INFO", "Uploading 5.1MB file to /api/upload...")
    status, response_body = send_multipart_request(f"{BASE_URL}/upload", {}, "large_file.csv", large_csv_bytes)
    
    log("INFO", f"Response Status Code: {status}")
    log("INFO", f"Response Body: {response_body}")
    
    if status == 413:
        log("PASS", "Server successfully rejected 5.1MB file with HTTP 413 (Payload Too Large).")
        try:
            res_data = json.loads(response_body)
            error_msg = res_data.get("error", {}).get("message", "")
            if "File size exceeds the limit of 5MB." in error_msg:
                log("PASS", f"Error message matches expected: '{error_msg}'")
            else:
                log("FAIL", f"Unexpected error message: '{error_msg}'")
        except Exception as e:
            log("FAIL", f"Failed to parse error response JSON: {e}")
    else:
        log("FAIL", f"Expected HTTP 413 for oversized file, but got HTTP {status}.")

    # 2. Test 2000 Records Limit (HTTP 422)
    # Generate a CSV in-memory with 2001 rows (excluding header)
    log("INFO", "Generating CSV content in-memory with 2001 lead records...")
    csv_rows = ["created_at,name,email,mobile_without_country_code"]
    for i in range(2001):
        csv_rows.append(f"2026-07-07,Lead {i},lead{i}@example.com,9999911111")
    records_csv_bytes = "\n".join(csv_rows).encode('utf-8')
    
    log("INFO", "Uploading CSV with 2001 rows to /api/import...")
    status, response_body = send_multipart_request(f"{BASE_URL}/import", {}, "too_many_records.csv", records_csv_bytes)
    
    log("INFO", f"Response Status Code: {status}")
    log("INFO", f"Response Body: {response_body}")
    
    if status == 422:
        log("PASS", "Server successfully rejected 2001 records with HTTP 422 (Unprocessable Entity).")
        try:
            res_data = json.loads(response_body)
            error_msg = res_data.get("error", {}).get("message", "")
            if "exceeds the maximum of 2,000 records" in error_msg:
                log("PASS", f"Error message matches expected: '{error_msg}'")
            else:
                log("FAIL", f"Unexpected error message: '{error_msg}'")
        except Exception as e:
            log("FAIL", f"Failed to parse error response JSON: {e}")
    else:
        log("FAIL", f"Expected HTTP 422 for oversized records CSV, but got HTTP {status}.")

if __name__ == "__main__":
    print("=========================================================")
    print("🧪 RUNNING SIZE AND RECORD LIMIT STRESS TESTS")
    print(f"Target Base URL: {BASE_URL}")
    print("=========================================================")
    
    run_limit_tests()
    
    # Final Summary
    print("\n" + "="*50)
    print("📊 STRESS TEST REPORT SUMMARY")
    print("="*50)
    print(f"Total assertions checked: {pass_count + fail_count}")
    print(f"Passed assertions: {pass_count}")
    print(f"Failed assertions: {fail_count}")
    
    if fail_count > 0:
        sys.exit(1)
    else:
        print(f"\n{GREEN}✅ All limit guards verified successfully!{NC}")
        sys.exit(0)
