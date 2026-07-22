# Sử dụng Node.js 20 phiên bản alpine (rất nhẹ)
FROM node:20-alpine

# Đặt thư mục làm việc bên trong container
WORKDIR /app

# Copy package.json trước để tận dụng cache của Docker
COPY package.json ./

# Cài đặt tất cả các thư viện npm
RUN npm install

# Copy toàn bộ source code vào container
COPY . .

# Mở cổng 5173 (cổng mặc định của Vite)
EXPOSE 5173

# Lệnh chạy Vite dev server, dùng --host để expose ra bên ngoài container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
