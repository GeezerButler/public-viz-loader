FROM mcr.microsoft.com/playwright:v1.36.2-jammy

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

COPY . .

CMD ["playwright", "test"]