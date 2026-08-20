# Aiven 部署指南

本專案可使用 **Aiven for MySQL** 作為資料庫。若您的帳戶已獲得 **Aiven Apps** 存取資格，亦可使用根目錄的 `Containerfile` 部署 Node.js 應用程式；Aiven Apps 目前為 Limited Availability，且不定位為通用的公開高流量網站主機。因此，未取得 Aiven Apps 資格時，請將本專案部署至您選用的 Node.js／容器主機，並將 Aiven 僅用於 MySQL。[1]

## 1. 建立 Aiven MySQL

在 Aiven Console 建立 MySQL service，待狀態為 **Running** 後，於 Overview 的 Connection information 取得 host、port、user、password、database 與 CA certificate。Aiven 建議為連線設定 SSL CA certificate。[2]

建立名為 `baccarat_predictor` 的資料庫與專用 service user。請限制使用者權限於此資料庫，勿使用管理者帳號作為應用程式帳號。

## 2. 匯入現有資料

解壓交付封包後，以 Aiven 下載的 CA certificate 連線，再匯入 `../database/baccarat_predictor_database.sql`：

```bash
mysql --host="$AIVEN_MYSQL_HOST" --port="$AIVEN_MYSQL_PORT" \
  --user="$AIVEN_MYSQL_USER" --password --ssl-mode=VERIFY_CA \
  --ssl-ca=./ca.pem baccarat_predictor < ../database/baccarat_predictor_database.sql
```

匯入檔含既有資料，請先在 Aiven 新建且空白的資料庫執行；不要對已含正式資料的資料庫直接匯入。

## 3. 設定應用程式環境變數

將 Aiven CA certificate 轉為單行 base64，再設定為部署平台的 secret：

```bash
base64 -w 0 ./ca.pem
```

| 名稱 | 說明 |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:PORT/baccarat_predictor`，其中密碼需 URL encode。 |
| `DATABASE_SSL_CA_BASE64` | Aiven CA certificate 的單行 base64 值。 |
| `JWT_SECRET` | 用於簽署 session 的高熵隨機值。 |
| `OAUTH_SERVER_URL`、`VITE_APP_ID`、`VITE_OAUTH_PORTAL_URL`、`OWNER_OPEN_ID` | 依您選用的 OAuth／應用程式平台設定。 |

## 4. 建置與執行

本機驗證：

```bash
pnpm install
pnpm check
pnpm test
pnpm build
NODE_ENV=production PORT=3000 pnpm start
```

若使用 Aiven Apps，請以 `Containerfile` 建置容器並將上述 secrets 設為應用程式的 runtime variables。若使用其他容器主機，請同樣使用 `Containerfile`，並確保平台把 `PORT` 注入應用程式。

## 參考資料

[1] [Aiven Apps](https://aiven.io/apps)

[2] [Aiven for MySQL：Get started](https://aiven.io/docs/products/mysql/get-started)；[Aiven for MySQL：SSL 連線](https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench)
