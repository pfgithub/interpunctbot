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
      "password": "dbps*u(q)++[]",
      "database": "interpunctbot"
    }
  }
};
