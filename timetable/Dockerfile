FROM node:20-alpine

# Use Israel timezone so SQLite's datetime('now','localtime') matches the clock
# users see in the UI. Without this the container runs in UTC and stored times
# are offset by 2–3 hours.
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Jerusalem /etc/localtime \
    && echo "Asia/Jerusalem" > /etc/timezone
ENV TZ=Asia/Jerusalem

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js ./
COPY public ./public/

# Volume for persistent database
VOLUME /app/data

ENV PORT=5222
ENV DB_PATH=/app/data/timetable.db

EXPOSE 5222

CMD ["node", "server.js"]
