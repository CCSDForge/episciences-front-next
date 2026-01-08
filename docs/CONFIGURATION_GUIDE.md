# Configuration & Customization Guide

This guide explains how the application manages configurations for different journals (API URLs, Colors, Feature Flags) using a **Dynamic Runtime Architecture**.

## 1. Overview: The `external-assets` Directory

The application relies on an external directory `external-assets/` to store journal-specific configurations.

- **Location:** `/external-assets` (Root of the project, ignored by Git).
- **File Format:** `.env.local.<journalCode>` (e.g., `.env.local.dc`, `.env.local.epijinfo`).

## 2. Dynamic Configuration Architecture (Multi-Tenant)

The application uses a **Runtime Dynamic Configuration** system. This enables a single build to serve multiple journals with different visual identities and settings.

### 🔄 How it works (The Flow)

1.  **User Request**: A user visits `https://epijinfo.episciences.org`.
2.  **Server-Side (Next.js)**:
    - The layout component calls `env-loader` to get the config for `epijinfo`.
    - **Cache Check**: The loader checks its in-memory RAM cache.
      - _Miss (First visit)_: Reads the file `external-assets/.env.local.epijinfo` from disk, parses it, and caches it in RAM.
      - _Hit (Subsequent visits)_: Returns the cached object immediately (Zero disk I/O).
3.  **Transport**: The server passes this configuration object (filtered for security) to the client components via initial props.
4.  **Client-Side (Browser)**:
    - `ClientProviders` receives the config and hydrates the Redux Store.
    - `ThemeStyleSwitch` applies the CSS variables (e.g., `--primary: #ff0000`) instantly.

### ⚡ Performance & Security

- **Performance**: Extremely high. Disk I/O happens only **once** per journal per server restart. All subsequent requests use in-memory RAM access.
- **Security**: Only variables starting with `NEXT_PUBLIC_` are sent to the client. Server secrets (if any) remain on the server.

## 3. Configuration Types

| Config Type       | Examples                            | Update Procedure | Lifecycle |
| :---------------- | :---------------------------------- | :--------------- | :-------- |
| **API URL**       | `NEXT_PUBLIC_API_ROOT_ENDPOINT`     | Restart Node.js  | Runtime   |
| **Colors**        | `NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR` | Restart Node.js  | Runtime   |
| **Feature Flags** | `NEXT_PUBLIC_..._RENDER`            | Restart Node.js  | Runtime   |

## 4. Updates & Deployment

### 📝 How to modify a configuration

Since the configuration is cached in memory for performance, modifying a file does not reflect immediately.

1.  **Edit File**: Modify `external-assets/.env.local.epijinfo` on the server.
    ```env
    NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR="#FF0000"
    ```
2.  **Apply Changes**: **Restart** the Node.js process.
    ```bash
    # Example commands
    npm run start
    # OR
    pm2 restart episciences-front
    ```
3.  **Result**: The server clears its RAM cache. On the next request, it re-reads the file and serves the new configuration.

**Comparison:**

- **Old System**: required a full **Rebuild** (3-5 minutes) for color changes.
- **New System**: requires only a **Restart** (seconds).

## 5. Local Development Override

To test specific configurations locally without modifying `external-assets`:

1.  Use `.env.local` in the project root.
2.  Variables in `external-assets` have higher priority than `.env.local`.
3.  To force an API URL locally, use `NEXT_PUBLIC_API_URL_FORCE`.
