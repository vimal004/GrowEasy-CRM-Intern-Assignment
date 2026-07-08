#!/usr/bin/env python3
import urllib.request
import urllib.error
import json
import mimetypes
import uuid
import sys
import os
import time
import ssl

# Bypass SSL certificate verification
ssl._create_default_https_context = ssl._create_unverified_context

BASE_URL = "https://groweasy-crm-api.onrender.com/api"
CSV_FILE = "/Users/vimalmanoharan/Downloads/02_edge_cases.csv"

GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
BOLD = '\033[1m'
NC = '\033[0m'

pass_count = 0
fail_count = 0
warn_count = 0
log_lines = []

def log(level, message):
    global pass_count, fail_count, warn_count, log_lines
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
    elif level == "WARN":
        prefix = "⚠️  WARN"
        colored = f"{YELLOW}{prefix}{NC}: {message}"
        warn_count += 1
    elif level == "INFO":
        prefix = "ℹ️  INFO"
        colored = f"{BLUE}{prefix}{NC}: {message}"
    elif level == "SECTION":
        colored = f"\n{CYAN}{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{NC}\n{CYAN}{BOLD} {message}{NC}\n{CYAN}{BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{NC}"
    
    print(colored)
    clean_msg = colored.replace(GREEN, "").replace(RED, "").replace(YELLOW, "").replace(BLUE, "").replace(CYAN, "").replace(BOLD, "").replace(NC, "")
    log_lines.append(clean_msg)

def encode_multipart(fields, files):
    boundary = uuid.uuid4().hex
    CRLF = '\r\n'
    parts = []
    
    for key, value in fields.items():
        parts.append(f'--{boundary}')
        parts.append(f'Content-Disposition: form-data; name="{key}"')
        parts.append('')
        parts.append(str(value))
        
    for key, filepath in files.items():
        parts.append(f'--{boundary}')
        filename = os.path.basename(filepath)
        parts.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"')
        ctype = mimetypes.guess_type(filepath)[0] or 'application/octet-stream'
        parts.append(f'Content-Type: {ctype}')
        parts.append('')
        with open(filepath, 'rb') as f:
            parts.append(f.read())
            
    parts.append(f'--{boundary}--')
    parts.append('')
    
    body = bytearray()
    for part in parts:
        if isinstance(part, str):
            body.extend(part.encode('utf-8'))
        else:
            body.extend(part)
        body.extend(CRLF.encode('utf-8'))
        
    content_type = f'multipart/form-data; boundary={boundary}'
    return content_type, bytes(body)

def send_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            status = response.status
            body = response.read().decode('utf-8')
            return status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

def run_tests():
    log("SECTION", "CONNECTIVITY & HEALTH CHECK")
    status, body = send_request(f"{BASE_URL}/health")
    if status == 200:
        log("PASS", f"Backend health endpoint responded successfully: {body.strip()}")
    else:
        log("FAIL", f"Health check failed with status {status}: {body}")
        return

    log("SECTION", "TEST 1: UPLOAD & PREVIEW (NO AI MAPPING)")
    if not os.path.exists(CSV_FILE):
        log("FAIL", f"Target CSV file not found: {CSV_FILE}")
        return
        
    content_type, body_data = encode_multipart({}, {"file": CSV_FILE})
    headers = {"Content-Type": content_type}
    
    status, body = send_request(f"{BASE_URL}/upload", "POST", headers, body_data)
    if status != 200:
        # Try /upload/preview
        log("WARN", f"POST /upload failed with status {status}. Trying POST /upload/preview...")
        status, body = send_request(f"{BASE_URL}/upload/preview", "POST", headers, body_data)
        
    if status != 200:
        log("FAIL", f"Preview failed with status {status}: {body}")
        return
        
    log("PASS", f"Preview request succeeded (HTTP {status})")
    
    try:
        preview_data = json.loads(body)
        meta = preview_data.get("metadata", {})
        log("INFO", f"Preview Metadata: Row Count={meta.get('rowCount')}, Col Count={meta.get('columnCount')}")
        log("INFO", f"Headers: {meta.get('headers')}")
        
        rows = preview_data.get("previewRows", preview_data.get("rows", []))
        log("INFO", f"Received {len(rows)} preview rows.")
        for idx, r in enumerate(rows):
            log("INFO", f"  Row {idx+1}: {r}")
            
    except Exception as e:
        log("FAIL", f"Error during preview parsing: {e}")

    log("SECTION", "TEST 2: AI IMPORT & NORMALIZATION PIPELINE")
    
    start_time = time.time()
    status, body = send_request(f"{BASE_URL}/import", "POST", headers, body_data)
    elapsed = time.time() - start_time
    log("INFO", f"Import pipeline completed in {elapsed:.2f} seconds.")
    
    if status != 200:
        log("FAIL", f"Import pipeline failed with status {status}: {body}")
        return
        
    log("PASS", "Import request succeeded (HTTP 200)")
    
    try:
        import_res = json.loads(body)
        imported = import_res.get("importedRecords", [])
        skipped = import_res.get("skippedRecords", [])
        metrics = import_res.get("metrics", {})
        
        log("SECTION", "METRICS SUMMARY")
        log("INFO", f"Total Uploaded Records: {metrics.get('totalRows', len(imported) + len(skipped))}")
        log("INFO", f"Imported Count: {metrics.get('importedCount', len(imported))}")
        log("INFO", f"Skipped Count: {metrics.get('skippedCount', len(skipped))}")
        log("INFO", f"Success Rate: {metrics.get('successRate')}%")
        log("INFO", f"Processing Time: {metrics.get('processingTimeMs')} ms")
        
        log("SECTION", "IMPORTED RECORDS ANALYSIS")
        for idx, rec in enumerate(imported):
            log("INFO", f"--- Record {idx+1} (Name: {rec.get('name')}) ---")
            for k, v in rec.items():
                if v:
                    log("INFO", f"  {k}: {repr(v)}")

        log("SECTION", "SKIPPED RECORDS ANALYSIS")
        for idx, rec in enumerate(skipped):
            log("INFO", f"--- Skipped Record {idx+1} (Index: {rec.get('rowIndex')}) ---")
            log("INFO", f"  Row Index: {rec.get('rowIndex')}")
            log("INFO", f"  Reason: {rec.get('reason')}")
            log("INFO", f"  Raw Data: {rec.get('rawRecord')}")

        log("SECTION", "ASSERTION VERIFICATION")
        
        # Helper to find imported record
        def get_imported_by_name(name_query):
            for r in imported:
                if name_query.lower() in r.get("name", "").lower():
                    return r
            return None

        # Assertions
        # 1. Alice: primary email 'alice@a.com', primary phone '5551112222', secondary email and phone in crm_note, note contains VIP
        alice = get_imported_by_name("Alice")
        if alice:
            log("INFO", "Verifying Alice...")
            if alice.get("email") == "alice@a.com":
                log("PASS", "Alice: email correctly set to 'alice@a.com'")
            else:
                log("FAIL", f"Alice: email got '{alice.get('email')}', expected 'alice@a.com'")
                
            mobile = alice.get("mobile_without_country_code", "")
            if "5551112222" in mobile:
                log("PASS", f"Alice: mobile correctly set to '{mobile}' (injected first phone)")
            else:
                log("FAIL", f"Alice: mobile got '{mobile}', expected '5551112222'")
                
            note = alice.get("crm_note", "")
            if "alice@b.com" in note and "5553334444" in note and "VIP" in note:
                log("PASS", "Alice: secondary contact info and note VIP found in crm_note")
            else:
                log("FAIL", f"Alice: crm_note missing expected details. Note: '{note}'")
        else:
            log("FAIL", "Alice was not imported!")

        # 2. Bob: mobile '04423456789', country India
        bob = get_imported_by_name("Bob")
        if bob:
            log("INFO", "Verifying Bob...")
            mobile = bob.get("mobile_without_country_code", "")
            if "23456789" in mobile:
                log("PASS", f"Bob: mobile correctly parsed to '{mobile}'")
            else:
                log("FAIL", f"Bob: mobile got '{mobile}', expected '04423456789' or similar")
            country = bob.get("country", "")
            if country.lower() == "india":
                log("PASS", "Bob: country correctly set to 'India'")
            else:
                log("FAIL", f"Bob: country got '{country}', expected 'India'")
        else:
            log("FAIL", "Bob was not imported!")

        # 3. Carol: skipped since both email and phone are invalid
        carol_skipped = False
        for s in skipped:
            raw = str(s.get("rawRecord", {}))
            if "Carol" in raw or "bademail" in raw:
                carol_skipped = True
                log("PASS", f"Carol: successfully skipped as expected. Reason: '{s.get('reason')}'")
                break
        if not carol_skipped:
            # Let's check if Carol is in imported (should not be!)
            carol_imp = get_imported_by_name("Carol")
            if carol_imp:
                log("FAIL", f"Carol: was imported when she should have been skipped! Record: {carol_imp}")
            else:
                log("WARN", "Carol was not found in imported or skipped records specifically, check raw records.")

        # 4. Dan: email 'dan@test.com', data_source='meridian_tower', description retained
        dan = get_imported_by_name("Dan")
        if dan:
            log("INFO", "Verifying Dan...")
            if dan.get("email") == "dan@test.com":
                log("PASS", "Dan: email correctly set to 'dan@test.com'")
            else:
                log("FAIL", f"Dan: email got '{dan.get('email')}', expected 'dan@test.com'")
                
            source = dan.get("data_source", "")
            if source == "meridian_tower":
                log("PASS", "Dan: data_source correctly set to 'meridian_tower'")
            else:
                log("FAIL", f"Dan: data_source got '{source}', expected 'meridian_tower'")
                
            desc = dan.get("description", "")
            if "Needs villa in Meridian Tower" in desc:
                log("PASS", "Dan: description successfully retained.")
            else:
                log("FAIL", f"Dan: description got '{desc}', expected 'Needs villa in Meridian Tower'")
        else:
            log("FAIL", "Dan was not imported!")

        # 5. Eva: email 'eva@test.com', mobile '9876543210', possession_time 'Dec 2027' or similar
        eva = get_imported_by_name("Eva")
        if eva:
            log("INFO", "Verifying Eva...")
            if eva.get("email") == "eva@test.com":
                log("PASS", "Eva: email correctly set to 'eva@test.com'")
            else:
                log("FAIL", f"Eva: email got '{eva.get('email')}', expected 'eva@test.com'")
                
            mobile = eva.get("mobile_without_country_code", "")
            if "9876543210" in mobile:
                log("PASS", f"Eva: mobile correctly set to '{mobile}'")
            else:
                log("FAIL", f"Eva: mobile got '{mobile}', expected '9876543210'")
                
            poss = eva.get("possession_time", "")
            if "Dec 2027" in poss or "Dec-2027" in poss:
                log("PASS", f"Eva: possession_time correctly extracted: '{poss}'")
            else:
                log("WARN", f"Eva: possession_time got '{poss}', expected 'Dec 2027'")
        else:
            log("FAIL", "Eva was not imported!")

    except Exception as e:
        log("FAIL", f"Error during assertions: {e}")

def write_log_file():
    filepath = "tests/results_02_edge_cases.txt"
    try:
        with open(filepath, "w") as f:
            f.write("\n".join(log_lines))
        print(f"\n📝 Saved detailed test report to: {filepath}")
    except Exception as e:
        print(f"Error saving log file: {e}")

if __name__ == "__main__":
    print("=========================================================")
    print("🧪 TESTING CSV FILE AGAINST DEPLOYED BACKEND")
    print(f"Target Base URL: {BASE_URL}")
    print(f"CSV File: {CSV_FILE}")
    print("=========================================================")
    
    run_tests()
    
    # Final Summary
    log("SECTION", "FINAL SUMMARY")
    total_tests = pass_count + fail_count + warn_count
    pass_pct = (pass_count / max(total_tests, 1)) * 100
    
    log("INFO", f"Total Assertions Checked: {total_tests}")
    log("INFO", f"Passed Assertions: {pass_count}")
    log("INFO", f"Failed Assertions: {fail_count}")
    log("INFO", f"Warnings: {warn_count}")
    log("INFO", f"Pass Rate: {pass_pct:.1f}%")
    
    write_log_file()
    
    if fail_count > 0:
        print(f"{RED}❌ Test completed with failures.{NC}")
        sys.exit(1)
    else:
        print(f"{GREEN}✅ All assertions verified successfully!{NC}")
        sys.exit(0)
