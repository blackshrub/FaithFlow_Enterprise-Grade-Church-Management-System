# Import/Export Module - Complete Documentation

## Overview

The Import/Export module provides enterprise-grade bulk data management for church members with comprehensive validation, field mapping, and audit trails.

## Features

### 1. **Import Wizard (5 Steps)**

#### Step 1: File Upload
- Drag-and-drop or browse file selection
- Supports CSV and JSON formats
- Auto-parsing and header extraction
- Sample data preview (first 5 records)

#### Step 2: Field Mapping
- Visual mapping interface
- Auto-mapping by field name matching
- Required field validation (First Name, Last Name, WhatsApp Number)
- Optional field selection
- Skip unused fields

#### Step 3: Value Mapping
- Transform source values to system format
- Predefined mappings for:
  - Gender: M/F, 1/2, L/P → male/female
  - Blood Type: A/B/AB/O → A+/A-/B+/B-/AB+/AB-/O+/O-
  - Marital Status: S/M/D/W → single/married/divorced/widowed
- Add custom mappings
- See unique values from file

#### Step 4: Simulation & Validation
- Validate all data without database commit
- Check duplicates (phone numbers)
- Validate required fields
- Validate date formats
- Validate enum values (gender, blood type, marital status)
- Show validation results:
  - Total records
  - Valid records
  - Invalid records with error messages
- Sample preview of valid data
- Auto-demographic assignment preview

#### Step 5: Import Execution
- Review summary
- Confirm and import
- Real-time progress
- Results display with success/failure counts
- Error details for failed records
- Import logging for audit trail

### 2. **Export Functionality**

- Export to CSV or JSON
- Filter by:
  - Member status (All, Active, Inactive)
  - Demographic category
- Exported fields:
  - Basic: First Name, Last Name, Email, Phone
  - Demographics: Date of Birth, Gender, Blood Type
  - Address: Address, City, State, Country
  - Church: Marital Status, Occupation
  - Dates: Baptism Date, Membership Date
  - Categories: Demographic Category, Notes
- Download as file

### 3. **Import History**

- View all past imports
- Details shown:
  - Date & Time
  - File Name
  - File Type
  - Total/Successful/Failed records
  - Status (Completed/Failed)
- Audit trail for compliance

### 4. **Data Validation Rules**

**Required Fields:**
- first_name
- last_name
- phone_whatsapp

**Optional Fields:**
- email
- date_of_birth
- gender (male, female, other)
- blood_type (A+, A-, B+, B-, AB+, AB-, O+, O-)
- address, city, state, country
- marital_status (single, married, divorced, widowed)
- occupation
- baptism_date
- membership_date
- notes

**Validations:**
- Duplicate phone number detection (per church)
- Date format validation (DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD)
- Enum validation for gender, blood_type, marital_status
- Auto-demographic assignment based on age

### 5. **Sample CSV Format**

```csv
first_name,last_name,phone_whatsapp,email,date_of_birth,gender,blood_type,marital_status
John,Doe,+6281234567890,john@example.com,15-05-1990,M,A+,S
Jane,Smith,+6281234567891,jane@example.com,20-08-1985,F,B+,M
Bob,Johnson,+6281234567892,bob@example.com,10-12-2010,M,O+,S
```

### 6. **Sample JSON Format**

```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "phone_whatsapp": "+6281234567890",
    "email": "john@example.com",
    "date_of_birth": "15-05-1990",
    "gender": "M",
    "blood_type": "A+",
    "marital_status": "S"
  }
]
```

### 7. **Value Mapping Examples**

**Gender Mapping:**
- M → male
- F → female
- 1 → male
- 2 → female
- L → male (Laki-laki)
- P → female (Perempuan)

**Marital Status Mapping:**
- S → single
- M → married
- D → divorced
- W → widowed

### 8. **Multi-Tenant Isolation**

- All imports scoped by church_id
- Validation checks for duplicates within church only
- Export filters apply to current church
- Import logs are church-specific

### 9. **Security & Safety**

- Admin-only access (require_admin middleware)
- Simulation step prevents accidental imports
- Rollback on validation failures
- Audit logging for all operations
- Church scoping prevents data leaks

### 10. **Performance Optimization**

- Database indexes on phone_whatsapp, church_id
- Streaming responses for exports
- Chunked processing for large files
- React Query caching

## API Endpoints

### Import Templates
- `POST /api/import-export/templates` - Create reusable template
- `GET /api/import-export/templates` - List templates

### Import Operations
- `POST /api/import-export/parse-file` - Parse and preview file
- `POST /api/import-export/simulate` - Validate without importing
- `POST /api/import-export/import-members` - Execute import

### Export Operations
- `GET /api/import-export/export-members` - Export member data

### Logs
- `GET /api/import-export/logs` - Import history

## Usage Instructions

### Importing Members:

1. Navigate to Import/Export → Import tab
2. Upload CSV or JSON file (Step 1)
3. Map source columns to target fields (Step 2)
4. Configure value transformations (Step 3)
5. Review validation results (Step 4)
6. Confirm and import (Step 5)
7. View results and any errors

### Exporting Members:

1. Navigate to Import/Export → Export tab
2. Select format (CSV or JSON)
3. Apply filters (optional)
4. Click Download Export
5. File downloads automatically

### Viewing History:

1. Navigate to Import/Export → History tab
2. See all past imports
3. Review success/failure counts
4. Check error details

## Best Practices

1. **Always simulate first** - Never skip the validation step
2. **Review errors carefully** - Fix source data if needed
3. **Use templates** - Save field mappings for repeated imports
4. **Check history** - Monitor import success rates
5. **Export before import** - Backup existing data
6. **Test with small file first** - Validate mappings with 5-10 records

## Troubleshooting

**Q: Import fails with duplicate phone number**
A: Phone numbers must be unique within each church. Update or remove duplicates from source file.

**Q: Date validation errors**
A: Ensure dates match selected format (DD-MM-YYYY by default). Check Settings → General to change church default.

**Q: Gender values not recognized**
A: Use value mapping in Step 3 to transform your values (e.g., M → male).

**Q: Some records skipped**
A: Check validation results in Step 4. Missing required fields or invalid values will cause skips.

## Technical Notes

- **Max file size**: 10MB recommended
- **Max records**: 10,000 per import
- **Supported encodings**: UTF-8
- **Date formats**: DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD
- **Auto-demographics**: Calculated on import based on date_of_birth

---

**Status**: Production-ready, fully tested, enterprise-grade
**Version**: 1.0.0
**Last Updated**: November 2025
