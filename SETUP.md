# RITZ パーソナルジム予約システム セットアップ手順

## 1. Supabase プロジェクト作成

1. https://supabase.com にアクセスしてプロジェクト作成
2. Settings > API から以下を取得:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. .env.local を設定

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxx
```

## 3. データベースマイグレーション実行

Supabase ダッシュボード > SQL Editor で
`supabase/migrations/001_initial_schema.sql` の内容を全てコピーして実行

> ⚠️ `btree_gist` 拡張が必要な場合は先に実行:
> ```sql
> CREATE EXTENSION IF NOT EXISTS btree_gist;
> ```

## 4. 管理者アカウント作成

SQL Editor で実行（メール/パスワードは変更すること）:

```sql
-- 管理者ユーザーを Supabase Auth に作成
-- Supabase Dashboard > Authentication > Users から手動で作成し、
-- 以下で role を admin に更新:

UPDATE public.profiles
SET role = 'admin', name = '管理者名'
WHERE email = 'admin@example.com';
```

または Authentication > Users > "Add user" で作成後、
profiles テーブルで role を 'admin' に更新。

## 5. ローカル起動

```bash
npm run dev
```

## 6. 初期データ確認

マイグレーション実行後、以下が自動的に作成されます:
- 店舗: 小田原店、三島店
- サービス: トレーニング60分、整体30/60/90分

## ページ一覧

| URL | 説明 |
|-----|------|
| `/login` | ログイン（管理者・ゲスト共通） |
| `/admin` | 管理者ダッシュボード |
| `/admin/slots` | 予約枠作成・公開 |
| `/admin/bookings` | 予約一覧・キャンセル |
| `/admin/guests` | ゲスト登録・管理 |
| `/admin/staff` | スタッフ登録・管理 |
| `/guest` | ゲストホーム |
| `/guest/book` | 予約フロー（店舗→メニュー→日時） |
| `/guest/bookings` | 自分の予約一覧・キャンセル |

## フロー説明

```
管理者:
  1. スタッフ登録
  2. 予約枠作成（店舗・スタッフ・サービス・日時指定）
  3. 枠を「公開」に切り替え
  4. ゲストを招待（メール/パスワードを発行）

ゲスト:
  1. ログイン
  2. 店舗 → メニュー → 日付 → 時間を選択
  3. 予約確定
  4. 予約一覧からキャンセル可能
```
