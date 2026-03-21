# WiFi Ad Connect Mini Program

A WeChat Mini Program for creating WiFi access entries, generating mini program QR codes, and letting users scan to connect to store WiFi with a simple guided flow.

This project combines:

- A user-facing WiFi connection page
- A creator/admin flow for generating WiFi QR codes
- Cloud functions for secure WiFi info lookup and mini program code generation
- Poster export and record management tools for store operators

## Project Overview

The app is designed for shops, cafes, offices, or venues that want customers to connect to WiFi by scanning a mini program code instead of manually entering credentials.

Typical flow:

1. An operator creates a WiFi record with `shopName`, `SSID`, and `password`.
2. The app stores that record in the cloud database and generates a mini program code.
3. A customer scans the code and opens the mini program landing page.
4. The app fetches the WiFi credentials through a cloud function.
5. After the guided step or ad step, the mini program attempts to connect the device to WiFi.
6. The success page shows the connected WiFi name and useful follow-up info.

## Main Features

- Create WiFi records in cloud database
- Generate permanent mini program codes for each WiFi entry
- Scan-to-connect WiFi experience
- Optional ad-gated connection flow
- WiFi record list with search
- WiFi detail management page
- Export QR poster to photo album
- Cloud function based secure data query

![cfcdedddc423a3c0526c6972dfd0ffb6](https://github.com/user-attachments/assets/25e4f51f-5070-49bf-bc0f-7b180eda6409)![980606ab0b8e3b89f5617721937eb191](https://github.com/user-attachments/assets/6020a12d-cfe7-4895-9a92-194d6e21c50f)
![3144a943f697a8e9b4e4409c559c52e0](https://github.com/user-attachments/assets/2cc9301e-e5ef-41a6-8fdf-cfcf426d6395)

![b48f9b53611693fa519c8a223633086e](https://github.com/user-attachments/assets/06f39799-2e47-4d21-9605-ced4fb33d153)

## Project Structure

```text
miniprogram-1/
|-- app.js                         # Mini program entry, cloud init, scan parameter parsing
|-- app.json                       # Global routes, window config, permissions
|-- app.wxss                       # Global styles
|-- sitemap.json                   # WeChat sitemap config
|-- project.config.json            # WeChat DevTools project config
|-- project.private.config.json    # Local private DevTools config
|
|-- pages/
|   |-- list/                      # WiFi record list, search, delete, navigate to manage/create
|   |-- create/                    # Create WiFi entry and generate mini program code
|   |-- index/                     # Scan landing page and WiFi connection flow
|   |-- success/                   # Connection success page
|   |-- manage/                    # Manage one WiFi record, preview/save QR poster, delete
|   `-- logs/                      # Reserved example page
|
|-- components/
|   `-- navigation-bar/            # Reusable custom navigation bar component
|
|-- utils/
|   |-- wifi.js                    # WiFi init, permission handling, connect helper
|   `-- ad.js                      # Rewarded video ad helper, currently optional
|
|-- cloudfunctions/
|   |-- getWifiInfo/               # Query WiFi info by shopId
|   `-- getWxacode/                # Generate and upload mini program code image
|
`-- minitest/
    `-- test.config.json           # Mini program test config
```

## Page Introduction

### `pages/list`

The main management entry for existing WiFi records.

- Loads records from `wifi_list`
- Supports keyword search by shop name or SSID
- Opens create page
- Opens manage page
- Deletes records

### `pages/create`

Used by operators to create a new WiFi configuration.

- Input shop name
- Input SSID
- Input password
- Save record to cloud database
- Call cloud function to generate mini program code
- Save QR image to local album

### `pages/index`

The customer-facing landing page after scanning a mini program code.

- Reads `shopId` from scan params
- Calls `getWifiInfo`
- Displays WiFi/shop info
- Starts WiFi connection
- Supports optional ad display before connection

### `pages/success`

Displayed after a successful connection.

- Shows connected SSID
- Displays password for manual backup if needed
- Copies password to clipboard
- Reads local IP address

### `pages/manage`

Management page for a single WiFi record.

- Loads QR code detail
- Switches poster themes
- Previews QR code
- Exports a poster image to album
- Deletes the record and related cloud file

## Cloud Functions

### `getWifiInfo`

Looks up a WiFi record by `shopId` and returns only the fields needed by the client:

- `ssid`
- `password`
- `shopName`

This keeps the query logic on the cloud side instead of directly exposing all database details in the client.

### `getWxacode`

Generates a WeChat mini program unlimited code and uploads it to cloud storage.

Used after a WiFi record is created so the operator can share or print the code.

## Database Design

Current collection used by the project:

### `wifi_list`

Suggested fields based on the current code:

| Field | Type | Description |
|---|---|---|
| `shopId` | string | Unique short identifier used in QR scan scene |
| `shopName` | string | Store or location name |
| `ssid` | string | WiFi network name |
| `password` | string | WiFi password |
| `createTime` | date | Record creation time |
| `connectCount` | number | Reserved counter field |
| `qrcodeFileID` | string | Cloud storage file ID for generated code |

## Tech Stack

- WeChat Mini Program native framework
- WeChat Cloud Development
- Cloud Database
- Cloud Storage
- Cloud Functions
- `wx-server-sdk`

## Local Development

### Requirements

- WeChat DevTools
- A valid WeChat Mini Program AppID
- Cloud Development enabled in your WeChat project

### Setup

1. Open the project in WeChat DevTools.
2. Confirm `project.config.json` points to the correct `appid`.
3. Enable Cloud Development for the project.
4. Create or verify the cloud environment used in `app.js`.
5. Create the `wifi_list` collection in the cloud database.
6. Upload and deploy the cloud functions:
   - `cloudfunctions/getWifiInfo`
   - `cloudfunctions/getWxacode`
7. Test the create flow first, then scan the generated code to test the connection flow.

## Permissions and Platform Notes

- Android WiFi connection requires location permission.
- The app requests `scope.userLocation` before connecting to WiFi when needed.
- Saving posters or QR images requires album permission.
- WiFi connection behavior in WeChat DevTools is mocked by `utils/wifi.js`.

## Recommended README Notes for Deployment

Before production release, you may want to check:

- Cloud database permissions for `wifi_list`
- Privacy authorization flow
- Mini program code generation permissions
- Ad unit configuration in `utils/ad.js` if you enable rewarded ads
- Branding, store naming, and poster style customization

## Future Improvements

- Add admin authentication and role separation
- Add usage analytics for connect count
- Add shop grouping and multi-location support
- Add edit/update flow for existing WiFi records
- Add expiration or disable status for codes
- Replace placeholder ad config with live ad management

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

**You are free to:**

- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

**Under the following terms:**

- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.
- **NonCommercial** — You may not use the material for commercial purposes.

For any commercial use, please contact the author for a separate licensing agreement.
