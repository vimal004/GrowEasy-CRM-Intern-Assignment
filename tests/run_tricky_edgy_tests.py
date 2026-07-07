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
CSV_FILE = "tests/tricky_edge_datapoints.csv"

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
    log("SECTION", "TRICKY/EDGY DATA ROBUSTNESS TESTS: INITIAL VALIDATION")
    
    # 1. Health check
    status, body = send_request(f"{BASE_URL}/health")
    if status == 200:
        log("PASS", "Backend is healthy and reachable.")
    else:
        log("FAIL", f"Health check failed with status {status}")
        return

    # 2. Upload / Preview Test
    log("SECTION", "TEST 1: CSV PARSING PREVIEW & HEADER NORMALIZATION (/api/upload)")
    if not os.path.exists(CSV_FILE):
        log("FAIL", f"Test CSV file not found: {CSV_FILE}")
        return
        
    content_type, body_data = encode_multipart({}, {"file": CSV_FILE})
    headers = {"Content-Type": content_type}
    
    status, body = send_request(f"{BASE_URL}/upload", "POST", headers, body_data)
    if status != 200:
        log("FAIL", f"Preview upload failed with status {status}: {body}")
        return
        
    log("PASS", "Preview request succeeded (HTTP 200)")
    
    try:
        preview_data = json.loads(body)
        meta = preview_data.get("metadata", {})
        log("INFO", f"Preview Metadata: Row Count={meta.get('rowCount')}, Col Count={meta.get('columnCount')}")
        
        # Verify row and column count
        if meta.get("rowCount") == 17:
            log("PASS", "Preview detected exactly 17 data rows.")
        else:
            log("FAIL", f"Expected 17 rows, got {meta.get('rowCount')}")
            
        if meta.get("columnCount") == 19:
            log("PASS", "Preview detected exactly 19 headers.")
        else:
            log("FAIL", f"Expected 19 columns, got {meta.get('columnCount')}")
            
        # Verify tricky header normalization (leading/trailing spaces trimmed by parser)
        headers_list = meta.get("headers", [])
        expected_headers = ["c r e a t e d _ a t", "E-M-A-I-L", "m.o.b.i.l.e.", "C_R_M_S_T_A_T_U_S", "d a t a s o u r c e", "Client Name"]
        missing_headers = [h for h in expected_headers if h not in headers_list]
        if not missing_headers:
            log("PASS", f"All normalized headers preserved in metadata: {headers_list}")
        else:
            log("FAIL", f"Missing raw headers: {missing_headers}")
            
    except Exception as e:
        log("FAIL", f"Error during preview assertions: {e}")

    # 3. Import Pipeline Test
    log("SECTION", "TEST 2: CRM FIELD NORMALIZATION & ROBUSTNESS PIPELINE (/api/import)")
    
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
        
        log("INFO", f"Metrics -> Imported: {metrics.get('importedCount')}, Skipped: {metrics.get('skippedCount')}, Success Rate: {metrics.get('successRate')}%")
        
        # Verify counts
        if metrics.get("importedCount") == 15:
            log("PASS", "Correctly imported exactly 15 records.")
        else:
            log("FAIL", f"Expected 15 imported records, got {metrics.get('importedCount')}")
            
        if metrics.get("skippedCount") == 2:
            log("PASS", "Correctly skipped exactly 2 records.")
        else:
            log("FAIL", f"Expected 2 skipped records, got {metrics.get('skippedCount')}")
            
        # Verify skipped rows indices and reasons
        # Index 9 (Oversized Phone No Email, CSV Line 10) and Index 16 (Empty Space Contact, CSV Line 17)
        skipped_indices = [s.get("rowIndex") for s in skipped]
        if 9 in skipped_indices and 16 in skipped_indices:
            log("PASS", "Skipped correct row indices (9 and 16).")
        else:
            log("FAIL", f"Expected skipped indices to be [9, 16], got {skipped_indices}")
            
        for s in skipped:
            log("INFO", f"Skipped Row {s.get('rowIndex')}: Reason='{s.get('reason')}'")

        # Find record helper
        def get_lead(name_query):
            for lead in imported:
                if name_query in lead.get("name", ""):
                    return lead
            return None

        # Verify Row 1: Extreme Header User
        lead = get_lead("Extreme Header User")
        if lead:
            log("PASS", f"Row 1 (Extreme Header User) imported successfully: Name='{lead.get('name')}', Email='{lead.get('email')}', Mobile='{lead.get('mobile_without_country_code')}', Status='{lead.get('crm_status')}', Source='{lead.get('data_source')}'")
            if lead.get("email") == "header@example.com" and lead.get("mobile_without_country_code") == "9999911111" and lead.get("crm_status") == "GOOD_LEAD_FOLLOW_UP" and lead.get("data_source") == "leads_on_demand":
                log("PASS", "Row 1 mappings match expected values.")
            else:
                log("FAIL", f"Row 1 mappings mismatch. Got: {lead}")
        else:
            log("FAIL", "Row 1 (Extreme Header User) not found in imported records.")

        # Verify Row 2: Microsecond Date User
        lead = get_lead("Microsecond Date User")
        if lead:
            created_at = lead.get("created_at", "")
            if created_at.startswith("2026-07-07"):
                log("PASS", f"Row 2 (Microsecond Date) parsed correctly: created_at='{created_at}'")
            else:
                log("FAIL", f"Row 2 created_at wrong: '{created_at}'")
        else:
            log("FAIL", "Row 2 not found.")

        # Verify Row 3: Natural Date User
        lead = get_lead("Natural Date User")
        if lead:
            created_at = lead.get("created_at", "")
            if created_at.startswith("2026-07-07"):
                log("PASS", f"Row 3 (Natural Date) parsed correctly: created_at='{created_at}'")
            else:
                log("FAIL", f"Row 3 created_at wrong: '{created_at}'")
        else:
            log("FAIL", "Row 3 not found.")

        # Verify Row 4: Two Digit Year User
        lead = get_lead("Two Digit Year User")
        if lead:
            created_at = lead.get("created_at", "")
            if created_at.startswith("2026-07-07"):
                log("PASS", f"Row 4 (Two Digit Year Date) parsed correctly: created_at='{created_at}'")
            else:
                log("FAIL", f"Row 4 created_at wrong: '{created_at}'")
        else:
            log("FAIL", "Row 4 not found.")

        # Verify Row 6: Fallback Date User
        lead = get_lead("Fallback Date User")
        if lead:
            created_at = lead.get("created_at", "")
            if created_at and "Invalid Date" not in created_at:
                log("PASS", f"Row 6 (Invalid Date Fallback) parsed to valid date: created_at='{created_at}'")
            else:
                log("FAIL", f"Row 6 date fallback failed: '{created_at}'")
        else:
            log("FAIL", "Row 6 not found.")

        # Verify Row 7: Delimiter Contacts User
        lead = get_lead("Delimiter Contacts User")
        if lead:
            email = lead.get("email", "")
            mobile = lead.get("mobile_without_country_code", "")
            note = lead.get("crm_note", "")
            if email == "first@test.com":
                log("PASS", f"Row 7 extracted first email correctly: '{email}'")
            else:
                log("FAIL", f"Row 7 email mismatch: '{email}'")
            if mobile == "9876543210":
                log("PASS", f"Row 7 extracted first phone number correctly: '{mobile}'")
            else:
                log("FAIL", f"Row 7 phone mismatch: '{mobile}'")
            if "second@test.com" in note and "87654-32109" in note:
                log("PASS", "Row 7 appended extra contacts to crm_note successfully.")
            else:
                log("FAIL", f"Row 7 crm_note missing extra contacts. Note: '{note}'")
        else:
            log("FAIL", "Row 7 not found.")

        # Verify Row 8: Oversized Phone With Email
        lead = get_lead("Oversized Phone With Email")
        if lead:
            email = lead.get("email", "")
            mobile = lead.get("mobile_without_country_code", "")
            if email == "oversized-with-email@example.com":
                log("PASS", "Row 8 imported with valid email.")
            else:
                log("FAIL", f"Row 8 email mismatch: '{email}'")
            if mobile == "":
                log("PASS", "Row 8 cleared the oversized phone number (>15 digits) successfully.")
            else:
                log("FAIL", f"Row 8 failed to clear oversized mobile: '{mobile}'")
        else:
            log("FAIL", "Row 8 not found.")

        # Verify Row 11: SQL/XSS Injection strings in fields
        lead = get_lead("O'Connor")
        if lead:
            name = lead.get("name", "")
            company = lead.get("company", "")
            note = lead.get("crm_note", "")
            log("PASS", f"Row 11 (Injection payloads) imported without server crash.")
            if "O'Connor" in name:
                log("PASS", f"Row 11 preserved single quote name safely: '{name}'")
            else:
                log("FAIL", f"Row 11 name mutated: '{name}'")
            if "<b>Bold Company</b>" in company:
                log("PASS", f"Row 11 preserved HTML company safely: '{company}'")
            else:
                log("FAIL", f"Row 11 company mutated: '{company}'")
        else:
            log("FAIL", "Row 11 (Injection) not found.")

        # Verify Row 12: Fuzzy Status Borderline
        lead = get_lead("Fuzzy Status Borderline")
        if lead:
            status_val = lead.get("crm_status", "")
            if status_val == "DID_NOT_CONNECT":
                log("PASS", f"Row 12 mapped 'phone busy call again later' -> '{status_val}'")
            else:
                log("FAIL", f"Row 12 status wrong: '{status_val}'")
        else:
            log("FAIL", "Row 12 not found.")

        # Verify Row 13: Status No Match
        lead = get_lead("Status No Match")
        if lead:
            status_val = lead.get("crm_status", "")
            if status_val == "":
                log("PASS", f"Row 13 (no match status) fell back to empty string: '{status_val}'")
            else:
                log("FAIL", f"Row 13 status not empty: '{status_val}'")
        else:
            log("FAIL", "Row 13 not found.")

        # Verify Row 14: Source Fuzzy Borderline
        lead = get_lead("Source Fuzzy Borderline")
        if lead:
            source_val = lead.get("data_source", "")
            if source_val == "sarjapur_plots":
                log("PASS", f"Row 14 mapped 'sarjapur plot' -> '{source_val}'")
            else:
                log("FAIL", f"Row 14 source wrong: '{source_val}'")
        else:
            log("FAIL", "Row 14 not found.")

        # Verify Row 15: Source No Match
        lead = get_lead("Source No Match")
        if lead:
            source_val = lead.get("data_source", "")
            if source_val == "":
                log("PASS", f"Row 15 (no match source) fell back to empty string: '{source_val}'")
            else:
                log("FAIL", f"Row 15 source not empty: '{source_val}'")
        else:
            log("FAIL", "Row 15 not found.")

        # Verify Row 17: Huge Columns User (Metadata mapping)
        lead = get_lead("Huge Columns User")
        if lead:
            note = lead.get("crm_note", "")
            if "Metadata:" in note and "Col1: Val1" in note and "Col5: Val5" in note:
                log("PASS", f"Row 17 (Huge columns) parsed extra columns into metadata notes: '{note}'")
            else:
                log("FAIL", f"Row 17 crm_note wrong: '{note}'")
        else:
            log("FAIL", "Row 17 not found.")
            
    except Exception as e:
        log("FAIL", f"Error during import pipeline assertions: {e}")

def write_log_file():
    os.makedirs("tests", exist_ok=True)
    filepath = "tests/results_tricky_edgy_tests.txt"
    try:
        with open(filepath, "w") as f:
            f.write("\n".join(log_lines))
        print(f"\n📝 Saved detailed test report to: {filepath}")
    except Exception as e:
        print(f"Error saving log file: {e}")

if __name__ == "__main__":
    print("=========================================================")
    print("🧪 RUNNING TRICKY & EDGY DATA ROBUSTNESS TESTS ON DEPLOYED API")
    print(f"Target Base URL: {BASE_URL}")
    print("=========================================================")
    
    run_tests()
    
    # Final Summary
    log("SECTION", "FINAL TEST REPORT SUMMARY")
    total_tests = pass_count + fail_count + warn_count
    pass_pct = (pass_count / max(total_tests, 1)) * 100
    
    log("INFO", f"Total Assertions Checked: {total_tests}")
    log("INFO", f"Passed Assertions: {pass_count}")
    log("INFO", f"Failed Assertions: {fail_count}")
    log("INFO", f"Warnings: {warn_count}")
    log("INFO", f"Assertion Pass Rate: {pass_pct:.1f}%")
    
    write_log_file()
    
    if fail_count > 0:
        print(f"{RED}❌ Tests failed with {fail_count} failures.{NC}")
        sys.exit(1)
    else:
        print(f"{GREEN}✅ All robustness assertions passed successfully!{NC}")
        sys.exit(0)
