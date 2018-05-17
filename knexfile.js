module.exports = {
  "development": {
    "dialect": "sqlite3",
    "connection": {
      "filename": "data.db"
    },
    "useNullAsDefault": true
  },
  "production": {
    "client": "pg",
    "version": "9.3",
    "connection": {
      "host": "127.0.0.1",
      "port": "5433",
      "user": "interpunctbot",
      "password": "6b 57 ea 58 20 2d ec e6 35 57 81 f2 b0 67 da 4d 0e 7e c5 44 d1 4c 0d f0",
      "database": "interpunctbot"
    }
  }
};
