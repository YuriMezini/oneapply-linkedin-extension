# oneapply-linkedin-extension
Find your best referral path for every LinkedIn job.

# OneApply - Referral tool for LinkedIn

OneApply is a Chrome extension that helps job seekers focus on quality over volume.

Instead of tracking dozens of random applications, OneApply helps you identify roles where you already have the strongest network path, prioritize who to contact, and stay organized through the full outreach process.

## Why OneApply

Most job-search workflows are fragmented:
- jobs in one tab
- contacts in another
- notes in a spreadsheet
- outreach drafts in a separate doc

OneApply brings that into one workflow directly inside LinkedIn so you can act faster and more intentionally.

## Core Features

- Save LinkedIn contacts with context (connection degree, interaction history, recency, and shared background)
- Calculate a Referral Intelligence Score (RIS) to prioritize high-value connections
- Track LinkedIn jobs with status updates (`Saved`, `Applied`, `Interview`, `Offer`, `Passed`)
- Auto-match saved contacts to tracked jobs by company
- View everything in a side panel dashboard (contacts, jobs, and settings)
- Export contacts/jobs to CSV and copy contacts for Google Sheets
- Backup and restore data with JSON import/export
- Optional AI outreach assistant (uses your own Claude API key)

## How It Works

### 1) Save Contacts
On a LinkedIn profile, click **Save Contact**.
OneApply asks a few quick questions and computes an RIS score.

### 2) Track Jobs
On a LinkedIn job listing, click **Track This Job**.
OneApply extracts job details and checks for matching contacts at that company.

### 3) Prioritize Outreach
In the side panel, review matches, sort contacts by RIS, update job status, and keep notes for follow-ups.

## Referral Intelligence Score (RIS)

RIS is a weighted score designed to estimate outreach strength:
- connection degree
- prior interaction (met/messaged/none)
- recency of contact
- shared university, field, or company history

Score ranges are interpreted as:
- **100+**: Strong Match
- **60-99**: Warm Connection
- **0-59**: Not Recommended

## Installation (Local / Developer Mode)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked**.
5. Select the `OneApply` folder.

The extension should now appear in your toolbar.

## Project Structure

- `manifest.json` - Chrome extension manifest (MV3)
- `content.js` / `content.css` - Injected LinkedIn UI + page-side logic
- `sidepanel.html` / `sidepanel.js` - Main dashboard UI and interactions
- `background.js` - Service worker and side panel behavior
- `popup.html` / `popup.js` - Extension popup
- `icons/` - Extension icons

## Data and Privacy

- Data is stored locally using `chrome.storage.local`.
- No backend server is required for core functionality.
- AI outreach is optional and only runs when you provide your own API key.
- API calls for AI are sent directly from the extension to Anthropic.

## AI Outreach (Optional)

When viewing a tracked job with matched contacts, you can generate:
- a short strategic insight
- recommended contacts to reconnect with
- a concise outreach message draft

To use this feature:
1. Create a Claude API key at [https://console.anthropic.com](https://console.anthropic.com)
2. Paste the key in the AI section inside the extension
3. Click **Ask Claude**

## Known Limitations

- Built specifically for LinkedIn page structures; major LinkedIn UI changes may require selector updates.
- Matching logic is company-string based and may miss edge cases with aliases/subsidiaries.
- AI output quality depends on contact data quality and API model behavior.

## Roadmap Ideas

- Smarter company/entity matching
- Follow-up reminders and lightweight CRM timeline
- Interview conversion analytics
- Team/shared referral tracking
- Optional cloud sync

## License

Add your preferred license here (for example: MIT).

