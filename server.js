require("dotenv").config();
require("./models/userModel");

const cors = require("cors"),
  express = require("express"),
  mongoose = require("mongoose");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

let session = require("express-session");

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 1000 * 3600 * 24 * 365,
    },
  })
);

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );

  if (!req.session.user) {
    req.session.user = null;
    req.session.isLogged = false;
  }
  next();
});

const productsRoutes = require("./routes/productsRoutes");
//const userRoutes = require("./routes/userRoutes");

mongoose.Promise = global.Promise;

//const connectionString = process.env.MONGODB_LOCAL_URL;
//const connectionString = "mongodb://localhost:27017/Database?retryWrites=true&w=majority";
const connectionString = `${process.env.MONGODB_LOCAL_URL}/${process.env.DATABASE_NAME}?${process.env.MONGODB_PARAMETERS}`;
console.log("connectionString", connectionString);

// Si dans le fichier .env on change la valeur de NODE_ENV et qu'on met
// 'prod', on se connectera à la base de données en ligne
// autre chose que 'prod', on se connectera à la base de données en locale
if (process.env.NODE_ENV === "prod") {
  connectionString = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.${process.env.MONGODB_ACCOUNT}.mongodb.net/Database?retryWrites=true&w=majority`;
}

mongoose
  .connect(connectionString || connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((db) => {
    productsRoutes(app, db);
    //userRoutes(app, db);

    app.listen(process.env.PORT || 3306, function () {
      console.log("api prête");
    });
  })
  .catch((err) => console.error(err.message));
