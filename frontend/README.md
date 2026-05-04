# RUN

`npm run test` Jest chạy liên tục, file nào đổi là test lại ngay, không đo coverage, chỉ test những file đã thay đổi so với nhánh main

`npm run testDebug` chỉ test file thay đổi (dựa trên git), chạy realtime, không đo coverage

`npm run testFinal` chạy toàn bộ test, không watch, không filter => trước khi push, CI/CD (GitHub Actions), SonarCloud

`npm run updateSnapshots` Jest lưu UI snapshot → lần sau so sánh

# ICON

[https://icons.expo.fyi/]
