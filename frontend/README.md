# RUN

`npm run test` Jest chạy liên tục, file nào đổi là test lại ngay, không đo coverage, chỉ test những file đã thay đổi so với nhánh main

`npm run testDebug` chỉ test file thay đổi (dựa trên git), chạy realtime, không đo coverage

`npm run testFinal` chạy toàn bộ test, không watch, không filter => trước khi push, CI/CD (GitHub Actions), SonarCloud

`npm run updateSnapshots` Jest lưu UI snapshot → lần sau so sánh

# ICON

[https://icons.expo.fyi/]

# LIB

`expo-secure-store` to store

```json
{
  "description": "Dinner",
  "amount": 300000,
  "currency": "VND",
  "paidByUserId": "11111111-1111-1111-1111-111111111111",
  "splitMode": "equal",
  "participants": [
    {
      "userId": "11111111-1111-1111-1111-111111111111",
      "value": 1
    },
    {
      "userId": "22222222-2222-2222-2222-222222222222",
      "value": 1
    },
    {
      "userId": "33333333-3333-3333-3333-333333333333",
      "value": 1
    }
  ]
}
```

# reminder

```json
{
  "targetUserIds": [
    "b936a423-4e3f-419a-9a9f-d1b9a2c2b5e3",
    "7f2be92b-40b9-4fe6-9d8d-943dbac44cbf"
  ],
  "channel": "in_app",
  "messageTemplate": "Please pay your debt before Friday.",
  "scheduledAt": "2026-05-25T10:00:00.000Z"
}
```

```POST /groups/:groupId/settlements
{
  "fromUserId": "22222222-2222-2222-2222-222222222222",
  "toUserId": "11111111-1111-1111-1111-111111111111",
  "amount": 150000,
  "note": "Paid back for dinner"
}
```
