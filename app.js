require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const path = require('node:path');
const exphbs = require('express-handlebars');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { v4: uuid } = require('uuid');

const app = express();
// add static support
app.use(express.static(path.join(__dirname, 'public')));
// Configure Handlebars as the view engine
// Configure Handlebars as the view engine
const hbs = exphbs.create({
  extname: '.hbs',
  helpers: {strong: function(options){
      return `<strong>${options.fn(this) }</strong>`;
    },
    contentFor: function(name, options) {
      if (!this._sections) {
          this._sections = {};
      }
      this._sections[name] = options.fn(this);
      return null;
    }
  },
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.use(express.json());
app.use(cookieParser());
// Parse JSON and URL-encoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Your pagination helper function
hbs.handlebars.registerHelper('pagination', function(currentPage, totalPages) {
  let html = '<div class="pagination">';
  if (currentPage > 1) {
    html += `<a href="/restaurants?page=${currentPage - 1}">Previous</a>`;
  }
  html += `<span>Page ${currentPage} of ${totalPages}</span>`;
  if (currentPage < totalPages) {
    html += `<a href="/restaurants?page=${currentPage + 1}">Next</a>`;
  }
  html += '</div>';
  return html;
});

// Your pagination helper function
hbs.handlebars.registerHelper('paginationSearch', function(currentPage, totalPages, searchQuery) {
  let html = '<div class="pagination">';
  if (currentPage > 1) {
    html += `<a href="/search?q=${searchQuery}&page=${currentPage - 1}">Previous</a>`;
  }
  html += `<span>Page ${currentPage} of ${totalPages}</span>`;
  if (currentPage < totalPages) {
    html += `<a href="/search?q=${searchQuery}&page=${currentPage + 1}">Next</a>`;
  }
  html += '</div>';
  return html;
});



const database = require("./config/database"); // Import database module correctly
console.log(database);

mongoose.connect(database.url, { useNewUrlParser: true, useUnifiedTopology: true }); // Ensure correct usage of the database URL

const Restaurants = require("./models/restaurants");
const User = require('./models/users');

const port = process.env.PORT || 8000;

// Define routes
app.get("/", (req, res) => {
  // Check if user is logged in based on the session cookie
  const isLoggedIn = req.cookies.session_id ? true : false;

  // Render the home page and pass the isLoggedIn variable
  res.render("home", { isLoggedIn });
});

// Route to handle logout
app.get('/logout', (req, res) => {
  // Clear the session cookie
  res.clearCookie('session_id');
  // Redirect the user to the login page
  const isLoggedIn = false;
  res.render("login", { isLoggedIn: isLoggedIn });
});

// Define the route for login
app.get("/login", (req, res) => {
    // Check if user is logged in based on the session cookie
    const isLoggedIn = false;
   res.render("login", {isLoggedIn}); // Render your login page here
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
      // Check if user is logged in based on the session cookie
    const isLoggedIn = req.cookies.session_id ? true : false;
    // Find the user by username
    const user = await User.findOne({ username });
    console.log("User:", user);
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }

    // Compare passwords
    if (password === user.password) {
      // Passwords match, generate session token
      const sessionToken = uuid();

      // Set session cookie with the token
      res.cookie('session_id', sessionToken);

          // Render the login success page (or any other page you want to render after login)
      res.render('login_success', { isLoggedIn : isLoggedIn }); // Make sure you have a login_success.hbs file in your views directory
    } else {
      // Passwords don't match, send unauthorized response
      return res.status(401).json({ msg: 'Invalid credentials' });
    }


  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
});

// Session validation middleware
const sessionValidator = (req, res, next) => {
  const sessionToken = req.cookies.session_id;

  // Validate session token
  if (!sessionToken || !isValidSession(sessionToken)) {
      return res.status(401).json({ msg: 'Unauthorized' });
  }

  next();
};

// Function to validate session token (can be enhanced as needed)
const isValidSession = (token) => {
  // Add your validation logic here
  // For simplicity, let's assume any non-empty string is valid
  return typeof token === 'string' && token.trim() !== '';
};

app.use(sessionValidator);

// Define route to render the form
app.get("/restaurants/add", (req, res) => {
  // Check if user is logged in based on the session cookie
  const isLoggedIn = req.cookies.session_id ? true : false;
  // Render the form to add a new restaurant
  res.render("add-restaurant", {isLoggedIn});
});

// Define route to handle form submission and insert new restaurant
app.post("/restaurants/add", async (req, res) => {
  try {
      // Extract restaurant details from the request body
      const { name, borough, cuisine, building, street, zipcode } = req.body;
     // Check if user is logged in based on the session cookie
     const isLoggedIn = req.cookies.session_id ? true : false;
      // Create a new restaurant object
      const newRestaurant = new Restaurants({
          name,
          borough,
          cuisine,
          address: {
              building,
              street,
              zipcode
          }
      });

      // Save the new restaurant to the database
      await newRestaurant.save();

      // Redirect to the restaurants listing page or any other page
      res.render("add-restaurant-success", {isLoggedIn});
  } catch (error) {
      console.error("Error adding restaurant:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});
// Search route
app.get("/search", async (req, res) => {
  try {
    const perPage = 10; // Display 10 search results per page
    const page = parseInt(req.query.page) || 1; // Get the requested page number from query params
    const searchQuery = req.query.q; // Get the search query from query params

    // Check if user is logged in based on the session cookie
    const isLoggedIn = req.cookies.session_id ? true : false;

    // Perform the search and fetch search results count
    const totalResultsCount = await Restaurants.countDocuments({
      name: { $regex: new RegExp(searchQuery, "i") }, // Case-insensitive search by restaurant name
    });

    // Calculate total number of pages
    const totalPages = Math.ceil(totalResultsCount / perPage);

    // Fetch search results for the requested page with pagination
    const searchResults = await Restaurants.find({
      name: { $regex: new RegExp(searchQuery, "i") }, // Case-insensitive search by restaurant name
    })
      .skip((page - 1) * perPage)
      .limit(perPage);
    const searchResultsObj = searchResults.map(rest => rest.toJSON());
    // Render the search results page
    res.render("search_results", {
      searchResultsObj,
      currentPage: page,
      totalPages,
      isLoggedIn,
      searchQuery,
    });
  } catch (error) {
    console.error("Error searching restaurants:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.get("/restaurants", async (_req, res) => {
  try {
    const perPage = 100; // Display at least 100 restaurant records per page
    const page = parseInt(_req.query.page) || 1; // Get the requested page number from query params

     // Check if user is logged in based on the session cookie
    const isLoggedIn = _req.cookies.session_id ? true : false;
    // Fetch restaurants count
    const totalRestaurantsCount = await Restaurants.countDocuments();

    // Calculate total number of pages
    const totalPages = Math.ceil(totalRestaurantsCount / perPage);

    // Fetch restaurants for the requested page with pagination
    const restaurants = await Restaurants.find()
      .skip((page - 1) * perPage)
      .limit(perPage);
	const restaurantsObj = restaurants.map(rest => rest.toJSON());
  res.setHeader('Content-Type', 'text/html'); // Set content type
    res.render('index', {
      restaurants: restaurantsObj,
      currentPage: page,
      totalPages,
      isLoggedIn
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => console.log(`Server ready on port ${port}. ${database.url}`));

module.exports = app;
