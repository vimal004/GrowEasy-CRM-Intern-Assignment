#!/bin/bash

# Port selection
PORT=${PORT:-8080}
API_URL=${API_URL:-http://127.0.0.1:$PORT/api}

# Helper to print test header
print_header() {
  echo "================================================================================"
  echo "TEST: $1"
  echo "================================================================================"
}

# Create temp files
DIR="/tmp/groweasy-tests"
mkdir -p "$DIR"

# ------------------------------------------------------------------------------
# Test 1: Date Formats Scenario
# ------------------------------------------------------------------------------
cat << 'EOF' > "$DIR/dates.csv"
created_at,name,email,mobile_without_country_code
"13/05/2026","DD/MM/YYYY Lead","date1@example.com","9876543210"
"13-05-2026","DD-MM-YYYY Lead","date2@example.com","9876543211"
"May 13 2026 14:30:00","Month name Lead","date3@example.com","9876543212"
"2026-05-13T14:30:00.000Z","ISO Lead","date4@example.com","9876543213"
"","Empty Date Lead","date5@example.com","9876543214"
"invalid-date","Invalid Date Lead","date6@example.com","9876543215"
EOF

print_header "1. Importing Date Format Edge Cases"
curl -s -X POST "$API_URL/import" \
  -F "file=@$DIR/dates.csv;type=text/csv" | python3 -m json.tool || curl -s -X POST "$API_URL/import" -F "file=@$DIR/dates.csv;type=text/csv"
echo -e "\n"

# ------------------------------------------------------------------------------
# Test 2: Multi-Contact Fields Scenario
# ------------------------------------------------------------------------------
cat << 'EOF' > "$DIR/multi_contacts.csv"
name,emails,mobiles
"Lead with Multi-Contacts 1","primary@example.com, secondary@example.com","+91 9876543210, +91 9988776655"
"Lead with Multi-Contacts 2","first@example.com; second@example.com","9876543210 / 8877665544"
EOF

print_header "2. Importing Multi-Contact (Emails/Phones) De-duplication Cases"
curl -s -X POST "$API_URL/import" \
  -F "file=@$DIR/multi_contacts.csv;type=text/csv" | python3 -m json.tool || curl -s -X POST "$API_URL/import" -F "file=@$DIR/multi_contacts.csv;type=text/csv"
echo -e "\n"

# ------------------------------------------------------------------------------
# Test 3: CSV Formula Injection Protection
# ------------------------------------------------------------------------------
cat << 'EOF' > "$DIR/formula_injection.csv"
name,email,company,mobile_without_country_code
"=CMD('open /Applications/Calculator.app')","inj1@example.com","Acme Corp","9876543210"
"+1234","inj2@example.com","Plus Corp","9876543211"
"-5678","inj3@example.com","Minus Corp","9876543212"
"@check","inj4@example.com","At Corp","9876543213"
EOF

print_header "3. Importing CSV Formula Injection Protection Cases"
curl -s -X POST "$API_URL/import" \
  -F "file=@$DIR/formula_injection.csv;type=text/csv" | python3 -m json.tool || curl -s -X POST "$API_URL/import" -F "file=@$DIR/formula_injection.csv;type=text/csv"
echo -e "\n"

# ------------------------------------------------------------------------------
# Test 4: Skip Rules Scenario
# ------------------------------------------------------------------------------
cat << 'EOF' > "$DIR/skip_rules.csv"
name,email,mobile_without_country_code
"Valid Lead 1 (Has Email Only)","email_only@example.com",""
"Valid Lead 2 (Has Phone Only)","","9876543210"
"Skipped Lead (No Email or Phone)","",""
EOF

print_header "4. Importing Skip Criteria Cases (No Email + No Phone)"
curl -s -X POST "$API_URL/import" \
  -F "file=@$DIR/skip_rules.csv;type=text/csv" | python3 -m json.tool || curl -s -X POST "$API_URL/import" -F "file=@$DIR/skip_rules.csv;type=text/csv"
echo -e "\n"

# ------------------------------------------------------------------------------
# Test 5: Validation Failures
# ------------------------------------------------------------------------------
print_header "5. Uploading Invalid File Types"
# Empty file
echo -n "" > "$DIR/empty.csv"
curl -s -X POST "$API_URL/upload" \
  -F "file=@$DIR/empty.csv;type=text/csv" | python3 -m json.tool || curl -s -X POST "$API_URL/upload" -F "file=@$DIR/empty.csv;type=text/csv"
echo ""

# Non-CSV file (txt file)
echo "Just some random text" > "$DIR/text.txt"
curl -s -X POST "$API_URL/upload" \
  -F "file=@$DIR/text.txt;type=text/plain" | python3 -m json.tool || curl -s -X POST "$API_URL/upload" -F "file=@$DIR/text.txt;type=text/plain"
echo ""

# Cleanup
rm -rf "$DIR"
