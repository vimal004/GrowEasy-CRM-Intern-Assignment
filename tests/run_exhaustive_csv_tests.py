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

# Bypass SSL certificate verification for local python environment
ssl._create_default_https_context = ssl._create_unverified_context

# Target Base URL
BASE_URL = "https://groweasy-crm-api.onrender.com/api"

# File paths
CSV_STANDARD = "tests/exhaustive_standard_fields.csv"
CSV_MESSY = "tests/exhaustive_messy_headers_contacts.csv"
CSV_SECURITY = "tests/exhaustive_security_format_corruption.csv"

# Color Codes
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
    # Strip ANSI colors for output log file
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

def test_api_endpoints():
    log("SECTION", "TEST GROUP 1: HEALTH & SERVER VALIDATION")
    
    # 1. Health
    status, body = send_request(f"{BASE_URL}/health")
    if status == 200:
        log("PASS", f"GET /health is online (HTTP {status})")
        try:
            data = json.loads(body)
            if data.get("status") == "healthy" or "status" in data:
                log("PASS", f"Health status field confirmed: {data.get('status')}")
            else:
                log("WARN", "Health status field missing or invalid")
        except Exception as e:
            log("FAIL", f"Failed to parse health response JSON: {e}")
    else:
        log("FAIL", f"GET /health returned HTTP {status}")
        
    # 2. Version
    status, body = send_request(f"{BASE_URL}/version")
    if status == 200:
        log("PASS", f"GET /version is online (HTTP {status})")
        log("INFO", f"Version info: {body.strip()}")
    else:
        log("WARN", f"GET /version returned HTTP {status}")

def run_standard_fields_tests():
    log("SECTION", f"TEST GROUP 2: STANDARD FIELD IMPORT ({CSV_STANDARD})")
    
    if not os.path.exists(CSV_STANDARD):
        log("FAIL", f"{CSV_STANDARD} file not found!")
        return
        
    content_type, body_data = encode_multipart({}, {"file": CSV_STANDARD})
    headers = {"Content-Type": content_type}
    
    log("INFO", f"Uploading {CSV_STANDARD} to /import (AI Pipeline)...")
    start = time.time()
    status, body = send_request(f"{BASE_URL}/import", "POST", headers, body_data)
    elapsed = time.time() - start
    log("INFO", f"Request completed in {elapsed:.2f} seconds.")
    
    if status != 200:
        log("FAIL", f"Standard import failed with HTTP {status}: {body}")
        return
        
    log("PASS", f"Standard import succeeded (HTTP {status})")
    
    try:
        data = json.loads(body)
        imported = data.get("importedRecords", [])
        skipped = data.get("skippedRecords", [])
        metrics = data.get("metrics", {})
        
        log("INFO", f"Metrics - Imported: {metrics.get('importedCount')}, Skipped: {metrics.get('skippedCount')}, Success Rate: {metrics.get('successRate')}%")
        
        # Verify counts
        # standard_fields.csv has 22 data rows. 1 should be skipped ("Skip Lead No Contact")
        if len(imported) == 21:
            log("PASS", f"Correctly imported 21 records")
        else:
            log("FAIL", f"Expected 21 imported records, got {len(imported)}")
            
        if len(skipped) == 1:
            log("PASS", f"Correctly skipped 1 record")
            s_row = skipped[0]
            if "Skip Lead No Contact" in str(s_row.get("row")) or "Ghost Corp" in str(s_row.get("row")):
                log("PASS", f"Skipped correct record: index {s_row.get('rowIndex')} - Reason: {s_row.get('reason')}")
            else:
                log("WARN", f"Skipped record has unexpected data: {s_row}")
        else:
            log("FAIL", f"Expected 1 skipped record, got {len(skipped)}")
            
        # Find record helper
        def get_rec(name):
            for r in imported:
                if r.get("name") == name:
                    return r
            return None
            
        # Verify Date formats
        date_fields_to_check = [
            ("Standard Lead", "2026-07-01"),
            ("Weird Date DD.MM.YYYY", "2026-05-13"),
            ("Weird Date YYYY/MM/DD", "2026-05-13"),
            ("Epoch Date", "2026-05-14"),  # 1778747448000 is 2026-05-14 UTC
            ("Text Date", "2026-05-13"),
            ("DD/MM/YYYY Date", "2026-05-13")
        ]
        
        for name, expected_prefix in date_fields_to_check:
            rec = get_rec(name)
            if rec:
                created_at = rec.get("created_at", "")
                if created_at.startswith(expected_prefix):
                    log("PASS", f"Date parsed correctly for {name}: {created_at}")
                else:
                    log("FAIL", f"Date parsing wrong for {name}: expected to start with {expected_prefix}, got {created_at}")
            else:
                log("FAIL", f"Could not find imported record named '{name}'")
                
        # Check Fallback Date specifically
        fallback_rec = get_rec("Fallback Date")
        if fallback_rec:
            created_at = fallback_rec.get("created_at", "")
            if created_at:
                log("PASS", f"Date fallback parsed successfully: {created_at}")
            else:
                log("FAIL", "Date fallback is empty")
        else:
            log("FAIL", "Could not find imported record 'Fallback Date'")
                    
        # Verify status fuzzy mappings
        status_checks = [
            ("Standard Lead", "GOOD_LEAD_FOLLOW_UP"),
            ("Fuzzy Status Good", "GOOD_LEAD_FOLLOW_UP"),
            ("Fuzzy Status DNC", "DID_NOT_CONNECT"),
            ("Fuzzy Status Bad", "BAD_LEAD"),
            ("Fuzzy Status Sale", "SALE_DONE"),
            ("Invalid Status Fallback", "")
        ]
        
        for name, expected_status in status_checks:
            rec = get_rec(name)
            if rec:
                status = rec.get("crm_status", "")
                if status == expected_status:
                    log("PASS", f"Status mapped correctly for '{name}': expected '{expected_status}', got '{status}'")
                else:
                    log("FAIL", f"Status mapping wrong for '{name}': expected '{expected_status}', got '{status}'")
            else:
                log("FAIL", f"Could not find imported record '{name}'")
                    
        # Verify Data Source mappings
        source_checks = [
            ("Standard Lead", "leads_on_demand"),
            ("Weird Date DD.MM.YYYY", "meridian_tower"),
            ("Weird Date YYYY/MM/DD", "eden_park"),
            ("Epoch Date", "varah_swamy"),
            ("Text Date", "sarjapur_plots"),
            ("Source Fuzzy Match", "sarjapur_plots"),
            ("Source Invalid Fallback", "")
        ]
        
        for name, expected_source in source_checks:
            rec = get_rec(name)
            if rec:
                source = rec.get("data_source", "")
                if source == expected_source:
                    log("PASS", f"Source mapped correctly for '{name}': expected '{expected_source}', got '{source}'")
                else:
                    log("FAIL", f"Source mapping wrong for '{name}': expected '{expected_source}', got '{source}'")
            else:
                log("FAIL", f"Could not find imported record '{name}'")
                    
    except Exception as e:
        log("FAIL", f"Error analyzing standard import response: {e}")

def run_messy_headers_tests():
    log("SECTION", f"TEST GROUP 3: MESSY HEADER & MULTI-CONTACT VALIDATION ({CSV_MESSY})")
    
    if not os.path.exists(CSV_MESSY):
        log("FAIL", f"{CSV_MESSY} file not found!")
        return
        
    content_type, body_data = encode_multipart({}, {"file": CSV_MESSY})
    headers = {"Content-Type": content_type}
    
    log("INFO", f"Uploading {CSV_MESSY} to /import (AI Pipeline)...")
    start = time.time()
    status, body = send_request(f"{BASE_URL}/import", "POST", headers, body_data)
    elapsed = time.time() - start
    log("INFO", f"Request completed in {elapsed:.2f} seconds.")
    
    if status != 200:
        log("FAIL", f"Messy import failed with HTTP {status}: {body}")
        return
        
    log("PASS", f"Messy import succeeded (HTTP {status})")
    
    try:
        data = json.loads(body)
        imported = data.get("importedRecords", [])
        skipped = data.get("skippedRecords", [])
        metrics = data.get("metrics", {})
        
        log("INFO", f"Metrics - Imported: {metrics.get('importedCount')}, Skipped: {metrics.get('skippedCount')}")
        
        # Verify counts: 6 rows. 1 skipped ("No Contact At All")
        if len(imported) == 5:
            log("PASS", f"Correctly imported 5 records from messy CSV")
        else:
            log("FAIL", f"Expected 5 imported records, got {len(imported)}")
            
        if len(skipped) == 1:
            log("PASS", f"Correctly skipped 1 record from messy CSV")
            s_row = skipped[0]
            if "No Contact" in str(s_row.get("row")):
                log("PASS", f"Skipped correct record: index {s_row.get('rowIndex')} - Reason: {s_row.get('reason')}")
            else:
                log("WARN", f"Skipped record has unexpected data: {s_row}")
        else:
            log("FAIL", f"Expected 1 skipped record, got {len(skipped)}")
            
        def get_rec(name):
            for r in imported:
                if r.get("name") == name:
                    return r
            return None

        # Verify messy mapping outputs on "Amit Kumar"
        rec = get_rec("Amit Kumar")
        if rec:
            name = rec.get("name", "")
            email = rec.get("email", "")
            mobile = rec.get("mobile_without_country_code", "")
            company = rec.get("company", "")
            city = rec.get("city", "")
            state = rec.get("state", "")
            country = rec.get("country", "")
            owner = rec.get("lead_owner", "")
            status_val = rec.get("crm_status", "")
            source_val = rec.get("data_source", "")
            possession = rec.get("possession_time", "")
            description = rec.get("description", "")
            
            if "Amit Kumar" in name: log("PASS", f"Mapped 'Client_Name' -> name: '{name}'")
            else: log("FAIL", f"Failed to map 'Client_Name' -> name. Got: '{name}'")
            
            if email == "amit@example.com": log("PASS", f"Mapped 'MailBox' -> email: '{email}'")
            else: log("FAIL", f"Failed to map 'MailBox' -> email. Got: '{email}'")
            
            if mobile == "9988776655": log("PASS", f"Mapped 'Ph_No' -> mobile_without_country_code: '{mobile}'")
            else: log("FAIL", f"Failed to map 'Ph_No' -> mobile_without_country_code. Got: '{mobile}'")
            
            if company == "Tech Solutions": log("PASS", f"Mapped 'Employer' -> company: '{company}'")
            else: log("FAIL", f"Failed to map 'Employer' -> company. Got: '{company}'")
            
            if city == "Mumbai": log("PASS", f"Mapped 'CityName' -> city: '{city}'")
            else: log("FAIL", f"Failed to map 'CityName' -> city. Got: '{city}'")
            
            if state == "MH": log("PASS", f"Mapped 'StateCode' -> state: '{state}'")
            else: log("FAIL", f"Failed to map 'StateCode' -> state. Got: '{state}'")
            
            if country == "India": log("PASS", f"Mapped 'CountryRegion' -> country: '{country}'")
            else: log("FAIL", f"Failed to map 'CountryRegion' -> country. Got: '{country}'")
            
            if owner == "agent@groweasy.ai": log("PASS", f"Mapped 'OwnerEmail' -> lead_owner: '{owner}'")
            else: log("FAIL", f"Failed to map 'OwnerEmail' -> lead_owner. Got: '{owner}'")
            
            if status_val == "GOOD_LEAD_FOLLOW_UP": log("PASS", f"Mapped 'StatusText' -> crm_status: '{status_val}'")
            else: log("FAIL", f"Failed to map 'StatusText' -> crm_status. Got: '{status_val}'")
            
            if source_val == "leads_on_demand": log("PASS", f"Mapped 'SourceChannel' -> data_source: '{source_val}'")
            else: log("FAIL", f"Failed to map 'SourceChannel' -> data_source. Got: '{source_val}'")
            
            if possession == "Ready": log("PASS", f"Mapped 'PossessionTimeframe' -> possession_time: '{possession}'")
            else: log("FAIL", f"Failed to map 'PossessionTimeframe' -> possession_time. Got: '{possession}'")
            
            if "messy header" in description.lower(): log("PASS", f"Mapped 'ShortDescription' -> description: '{description}'")
            else: log("FAIL", f"Failed to map 'ShortDescription' -> description. Got: '{description}'")
        else:
            log("FAIL", "Could not find imported record 'Amit Kumar'")
            
        # Verify deduplication for "John Smith"
        rec = get_rec("John Smith")
        if rec:
            name = rec.get("name", "")
            email = rec.get("email", "")
            mobile = rec.get("mobile_without_country_code", "")
            note = rec.get("crm_note", "")
            
            log("INFO", f"Deduplication Record: {name}")
            if email == "john.smith@gmail.com":
                log("PASS", f"Extracted first email: '{email}'")
            else:
                log("FAIL", f"Expected primary email 'john.smith@gmail.com', got '{email}'")
                
            if "john.alt@company.com" in note:
                log("PASS", f"Appended extra email 'john.alt@company.com' to crm_note: '{note}'")
            else:
                log("FAIL", f"Extra email not found in crm_note. Got: '{note}'")
                
            if "5551234567" in mobile or "15551234567" in mobile:
                log("PASS", f"Extracted first phone number: '{mobile}'")
            else:
                log("FAIL", f"Expected primary mobile containing '5551234567', got '{mobile}'")
                
            if "555-987-6543" in note:
                log("PASS", f"Appended extra phone '+1-555-987-6543' to crm_note")
            else:
                log("FAIL", f"Extra phone number not found in crm_note. Got: '{note}'")
        else:
            log("FAIL", "Could not find imported record 'John Smith'")
                
        # Verify alternative fallback mapping for "No Main Contacts"
        rec = get_rec("No Main Contacts")
        if rec:
            name = rec.get("name", "")
            email = rec.get("email", "")
            mobile = rec.get("mobile_without_country_code", "")
            note = rec.get("crm_note", "")
            
            log("INFO", f"Alternative Fallback Record: {name}")
            # Alt_Email normalized to altemail, which went to unmapped_data and then crm_note
            if email == "":
                log("PASS", f"Primary email correctly set to empty because Main MailBox was empty")
            else:
                log("FAIL", f"Expected empty primary email, got '{email}'")
                
            if mobile == "9876543210":
                log("PASS", f"Alt phone mapped to primary because main was empty: '{mobile}'")
            else:
                log("FAIL", f"Expected phone '9876543210', got '{mobile}'")
                
            if "backup@example.com" in note:
                log("PASS", f"Alternative email 'backup@example.com' captured in note/metadata: '{note}'")
            else:
                log("FAIL", f"Alternative email backup@example.com not found in crm_note")
        else:
            log("FAIL", "Could not find imported record 'No Main Contacts'")
            
        # Verify LLM Path extraction for "LLM Extract Lead"
        rec = get_rec("LLM Extract Lead")
        if rec:
            name = rec.get("name", "")
            email = rec.get("email", "")
            mobile = rec.get("mobile_without_country_code", "")
            description = rec.get("description", "")
            
            log("INFO", f"LLM Extraction Path Record: {name}")
            if email == "john.doe@llm.com":
                log("PASS", f"LLM correctly extracted email from unstructured text: '{email}'")
            else:
                log("FAIL", f"Expected email 'john.doe@llm.com', got '{email}'")
                
            if mobile == "9999988888":
                log("PASS", f"LLM correctly extracted mobile from unstructured text: '{mobile}'")
            else:
                log("FAIL", f"Expected mobile '9999988888', got '{mobile}'")
        else:
            log("FAIL", "Could not find imported record 'LLM Extract Lead'")
            
        # Verify multi contact in both fields for "Priya Patel"
        rec = get_rec("Priya Patel")
        if rec:
            name = rec.get("name", "")
            email = rec.get("email", "")
            mobile = rec.get("mobile_without_country_code", "")
            note = rec.get("crm_note", "")
            
            log("INFO", f"Multi Contacts Record: {name}")
            if email == "priya@example.com":
                log("PASS", f"Primary email extracted: '{email}'")
            else:
                log("FAIL", f"Expected email 'priya@example.com', got '{email}'")
                
            if mobile == "9876543210":
                log("PASS", f"Primary phone extracted: '{mobile}'")
            else:
                log("FAIL", f"Expected mobile '9876543210', got '{mobile}'")
                
            if "priya.work@example.com" in note:
                log("PASS", f"Alt email captured in note/metadata: '{note}'")
            else:
                log("FAIL", f"Alt email not found in crm_note")
                
            if "9876543211" in note or "9876543212" in note:
                log("PASS", f"Alt phone numbers captured in notes: '{note}'")
            else:
                log("FAIL", f"Alt phone numbers not found in notes")
        else:
            log("FAIL", "Could not find imported record 'Priya Patel'")
                
    except Exception as e:
        log("FAIL", f"Error analyzing messy import response: {e}")

def run_security_tests():
    log("SECTION", f"TEST GROUP 4: SECURITY & CORRUPTION STRESS VALIDATION ({CSV_SECURITY})")
    
    if not os.path.exists(CSV_SECURITY):
        log("FAIL", f"{CSV_SECURITY} file not found!")
        return
        
    content_type, body_data = encode_multipart({}, {"file": CSV_SECURITY})
    headers = {"Content-Type": content_type}
    
    log("INFO", f"Uploading {CSV_SECURITY} to /import (AI Pipeline)...")
    start = time.time()
    status, body = send_request(f"{BASE_URL}/import", "POST", headers, body_data)
    elapsed = time.time() - start
    log("INFO", f"Request completed in {elapsed:.2f} seconds.")
    
    if status != 200:
        log("FAIL", f"Security import failed with HTTP {status}: {body}")
        return
        
    log("PASS", f"Security import succeeded (HTTP {status})")
    
    try:
        data = json.loads(body)
        imported = data.get("importedRecords", [])
        
        # Verify counts: 8 rows, all should be imported
        if len(imported) == 8:
            log("PASS", f"Correctly imported all 8 rows")
        else:
            log("FAIL", f"Expected 8 imported records, got {len(imported)}")
            
        def get_rec(name):
            # Strip single quotes which might be prepended by escapeCsvInjection
            for r in imported:
                n = r.get("name", "")
                if n == name or n.lstrip("'") == name:
                    return r
            return None
            
        # Verify Formula Injection Escaping
        formula_cases = [
            ("=CMD(dangerous)", "name", "'=CMD(dangerous)"),
            ("+Plus Name", "name", "'+Plus Name"),
            ("-Minus Name", "name", "'-Minus Name"),
            ("@At Name", "name", "'@At Name")
        ]
        
        for name, field, expected in formula_cases:
            # We search for the record by its name (unescaped or escaped)
            rec = get_rec(name)
            if rec:
                val = rec.get(field, "")
                if val == expected:
                    log("PASS", f"CSV Injection escaped for '{name}' in {field}: '{val}'")
                else:
                    log("FAIL", f"CSV Injection NOT escaped for '{name}' in {field}. Got: '{val}'")
            else:
                log("FAIL", f"Could not find imported record '{name}'")
                
        # Check formula in note specifically on record "=CMD(dangerous)"
        danger_rec = get_rec("=CMD(dangerous)")
        if danger_rec:
            note = danger_rec.get("crm_note", "")
            if note.startswith("'") or note.startswith("Original Note:"):
                log("PASS", f"crm_note is safe from CSV Injection (prefixed or escaped): '{note}'")
            else:
                log("FAIL", f"crm_note is vulnerable to CSV Injection. Got: '{note}'")
        else:
            log("FAIL", "Could not find imported record '=CMD(dangerous)' for note check")
                    
        # Verify Line Break Escaping
        break_rec = get_rec("Line Break Name")
        if break_rec:
            company = break_rec.get("company", "")
            city = break_rec.get("city", "")
            note = break_rec.get("crm_note", "")
            
            log("INFO", f"Line Break Escaping Record: {break_rec.get('name')}")
            # Line breaks should be escaped to \n (literal slash n, i.e. \\n in JSON string)
            if "\\n" in company or "\n" not in company:
                log("PASS", f"Company line break escaped correctly: '{company}'")
            else:
                log("FAIL", f"Company contains raw unescaped line breaks: '{company}'")
                
            if "\\n" in city or "\n" not in city:
                log("PASS", f"City line break escaped correctly: '{city}'")
            else:
                log("FAIL", f"City contains raw unescaped line breaks: '{city}'")
                
            if "\\n" in note or "\n" not in note:
                log("PASS", f"crm_note line break escaped correctly: '{note}'")
            else:
                log("FAIL", f"crm_note contains raw unescaped line breaks: '{note}'")
        else:
            log("FAIL", "Could not find imported record 'Line Break Name'")
                
        # Verify Oversized Mobile Guard
        oversized_rec = get_rec("Oversized Mobile Lead")
        if oversized_rec:
            mobile = oversized_rec.get("mobile_without_country_code", "")
            if mobile == "":
                log("PASS", f"Oversized mobile (>15 digits) correctly blanked out to empty string")
            else:
                log("FAIL", f"Expected oversized mobile to be blanked out, but got: '{mobile}'")
        else:
            log("FAIL", "Could not find imported record 'Oversized Mobile Lead'")
                
        # Verify Very Long Text processing
        long_rec = get_rec("Very Long Text Lead")
        if long_rec:
            company = long_rec.get("company", "")
            note = long_rec.get("crm_note", "")
            if len(company) > 100:
                log("PASS", f"Processed long company field successfully: {len(company)} chars")
            else:
                log("FAIL", f"Long company field truncated: {len(company)} chars")
            if len(note) > 200:
                log("PASS", f"Processed long crm_note successfully: {len(note)} chars")
            else:
                log("FAIL", f"Long note field truncated: {len(note)} chars")
        else:
            log("FAIL", "Could not find imported record 'Very Long Text Lead'")
                
        # Verify Special Characters processing
        special_rec = get_rec("Special Characters *&^%")
        if special_rec:
            note = special_rec.get("crm_note", "")
            if "!@#$" in note:
                log("PASS", f"Processed special characters successfully: '{note}'")
            else:
                log("FAIL", f"Special characters corrupted or missing in note: '{note}'")
        else:
            log("FAIL", "Could not find imported record 'Special Characters *&^%'")
                
    except Exception as e:
        log("FAIL", f"Error analyzing security import response: {e}")

def write_log_file():
    os.makedirs("tests", exist_ok=True)
    filepath = "tests/results_exhaustive_csv_tests.txt"
    try:
        with open(filepath, "w") as f:
            f.write("\n".join(log_lines))
        print(f"\n📝 Saved detailed test report to: {filepath}")
    except Exception as e:
        print(f"Error saving log file: {e}")

if __name__ == "__main__":
    print("=========================================================")
    print("🧪 RUNNING EXHAUSTIVE DEPLOYED BACKEND DATA CSV TESTS")
    print(f"Target Base URL: {BASE_URL}")
    print("=========================================================")
    
    test_api_endpoints()
    run_standard_fields_tests()
    run_messy_headers_tests()
    run_security_tests()
    
    # Final Report Summary
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
        sys.exit(1)
    else:
        sys.exit(0)
