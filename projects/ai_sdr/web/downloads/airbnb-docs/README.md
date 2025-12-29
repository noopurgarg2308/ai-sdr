# Airbnb PDF Downloads

## Manual Download Instructions

The automated download failed due to network/timeout issues. Please download these files manually:

### Option 1: Direct Browser Download (Easiest)

1. **Q4 2024 Shareholder Letter:**
   - Open in browser: https://airbnb2020ipo.q4web.com/files/doc_financials/2024/q4/Airbnb_Q4-2024-Shareholder-Letter_Final.pdf
   - Right-click → "Save As" → Save to this folder

2. **2023 Annual Report:**
   - Open in browser: https://airbnb2020ipo.q4web.com/files/doc_financials/2023/q4/AIRBNB-10K-20241602.pdf
   - Right-click → "Save As" → Save to this folder

3. **More Investor Presentations:**
   - Visit: https://investors.airbnb.com/resources/default.aspx
   - Download any quarterly presentations you want

### Option 2: Using Browser Download Manager

1. Copy the URLs above
2. Paste into your browser's address bar
3. The PDF should open - use browser's download button
4. Save files to: `/Users/noopurgarg/openai-dev/projects/ai_sdr/web/downloads/airbnb-docs/`

### Option 3: Alternative - Use SEC EDGAR

If Airbnb's site doesn't work, get their 10-K from SEC:

1. Go to: https://www.sec.gov/edgar/search/
2. Search for: "Airbnb"
3. Find the latest 10-K filing
4. Download the PDF

## After Downloading

Once you have the PDFs in this folder, you can:

1. **Upload via Admin UI** (Recommended):
   - Go to: http://localhost:3000/admin/companies/cmj52tf810000w3lw1rvkkieh/media
   - Upload the PDF files directly
   - They'll be automatically processed

2. **Or convert to text and upload via script:**
   ```bash
   # Convert PDFs to text (requires pdftotext)
   pdftotext airbnb-q4-2024-shareholder-letter.pdf airbnb-q4-2024.txt
   pdftotext airbnb-2023-annual-report.pdf airbnb-2023-annual.txt
   
   # Copy to scripts folder
   cp *.txt ../scripts/quantivalq-docs/
   
   # Upload
   cd ../..
   npm run upload:quantivalq:text
   ```

## File Names Expected

- `airbnb-q4-2024-shareholder-letter.pdf`
- `airbnb-2023-annual-report.pdf`

Or any names you prefer - the system will work with any PDF filenames.
