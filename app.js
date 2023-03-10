const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false })); //body parser
app.use(express.static("public"));

app.use(express.json());
app.use(
  session({
    secret: "secret word",
    resave: false,
    saveUninitialized: false,
  })
);
// custom session middleware
app.use((req, res, next) => {
  if (req.session.email) {
    res.locals.isLoggedIn = true;
  } else {
    res.locals.isLoggedIn = false;
  }
  next();
});

const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "xenol",
});
connection.connect((err) => {
  err ? console.error(err) : console.log("DB succesfully Connected!"); // ternary operator
});

app.get("/", (req, res) => {
  res.render("home");
});

//custommiddleware
function logTimeStamp(req, res, next) {
  const timeStamp = new Date().toISOString();
  console.log("[${timestamp}] ${req.method} ${req.url}");
  next();
}

app.get("/about", logTimeStamp, (req, res) => {
  res.render("about");
});
app.get("/products", (req, res) => {
  connection.query("SELECT * FROM products", (error, results) => {
    console.log(results);

    res.render("products", { products: results });
  });
});

app.get("/product", (req, res) => {
  res.render("product");
});
app.post("/product", (req, res) => {
  connection.query(
    "INSERT INTO products(product_id, product_name,price) VALUES(?,?,?)",
    [req.body.id, req.body.name, req.body.price],
    (error) => {
      if (error) {
        console.log(error);
        res.status(500).render("error");
      } else {
        // get all products to the products page
        connection.query("SELECT * FROM products", (error, results) => {
          console.log(results);

          res.render("products", { products: results });
        });
      }
    }
  );
});
app.post("/product/:id", (req, res) => {
  // delete a product with id in params
  console.log(req.params.id);
  connection.query(
    "DELETE FROM products WHERE product_id =?",
    [req.params.id],
    (error) => {
      if (error) {
        res.render("error");
      } else {
        res.redirect("/product");
      }
    }
  );
});
app.get("/login", logTimeStamp, (req, res) => {
  res.render("login");
});
app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    res.redirect("/");
  });
});
app.post("/login", (req, res) => {
  // console.log(req.body);
  connection.query(
    "SELECT email, password FROM companies WHERE email =?",
    [req.body.email],
    (error, results) => {
      if (error) {
        res.status(500).render("error");
      } else {
        console.log(results);
        if (results.length > 0) {
          // compare passwords
          bcrypt.compare(
            req.body.password,
            results[0].password,
            function (err, result) {
              if (result) {
                // result ==true

                // successful login
                req.session.email = results[0].email;
                res.redirect("/");
              } else {
                res.render("login", { error: "password incorrect" });
              }
            }
          );
        } else {
          res.render("login", { error: "email does not exist" });
        }
      }
    }
  );
});

app.get("/register", (req, res) => {
  res.render("register");
});
app.post("/register", (req, res) => {
  console.log(req.body);
  const user = req.body;
  if (user.password === user.Confirm_password) {
    // check if email already exists
    connection.query(
      "SELECT email FROM companies WHERE email =?",
      [user.email],
      (error, results) => {
        if (error) {
          console.log(error);
          res.status(500).render("error");
        } else {
          //check the length of results(if greaterthan 0 the email already exists in db else continue to register/save to db)
          if (results.length > 0) {
            res.render("register", {
              error: true,
              EmailError: "Email is already registered",
              data: req.body,
            });
          } else {
            bcrypt.hash(
              req.body.password,
              10,

              function (err, hash) {
                connection.query(
                  "INSERT INTO companies(company_name,email,password,domain_name,num_of_employees,description,service) VALUES(?,?,?,?,?,?,?)",
                  [
                    req.body.company,
                    req.body.email,
                    hash,
                    req.body.domain,
                    req.body.num_of_employees,
                    req.body.description,
                    "general-3",
                  ],
                  (error) => {
                    error
                      ? res.status(500).render("error")
                      : res.redirect("/login");
                  }
                );

                // store hash in your password DB.
                //console.log(hash);
              }
            );
          }
        }
      }
    );
  } else {
    //render registration with error message
    res.render("register", {
      error: true,
      PasswordError: "Passwords and confirm password do not match",
      data: req.body,
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
