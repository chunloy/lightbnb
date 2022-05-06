const { Pool } = require('pg');

const pool = new Pool({
  user: 'aaronau',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

//pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => { console.log(response); });

const properties = require('./json/properties.json');
const users = require('./json/users.json');

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1;`, [email])
    .then(response => {
      //return null if user does not exist
      if (!response.rows[0]) return null;

      return response.rows[0];
    })
    .catch(err => {
      console.log(err.message);
    });
};
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
    .query(`SELECT * FROM users where id = $1`, [id])
    .then(response => {
      //return null if user does not exist
      if (!response.rows[0]) return null;

      return response.rows[0];
    })
    .catch(err => {
      console.log(err.message);
    });
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`
      INSERT INTO users (name, password, email)
      VALUES ($1, $2, $3)
      RETURNING *;`, [user.name, user.password, user.email]
    )
    .then(response => {
      return response.rows[0];
    })
    .catch(err => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
      SELECT properties.*, reservations.*, avg(rating) as average_rating 
      FROM properties
      JOIN reservations ON properties.id = reservations.property_id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date
      LIMIT $2;`,
      [guest_id, limit])
    .then(response => {
      return response.rows;
    })
    .catch(err => {
      console.log(err.message);
    });
};
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  // return pool
  //   .query(`SELECT * FROM properties LIMIT $1;`, [limit])
  //   .then(response => {
  //     return response.rows;
  //   })
  //   .catch((err) => {
  //     console.log(err.message);
  //   });

  //-----------------------CITY-----------------------------
  //1 set up array to hold potential parameters
  const queryParams = [];

  //2 start building query string before WHERE clause
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  //3 Check if city was pass as an option
  //user length of array to dynamically access $n
  //make sure '%' is part of the paramter, not the string
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `; //queryParams.length --> $1
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    if (queryParams.length === 1) {
      queryString += `WHERE owner_id = $${queryParams.length} `; //queryParams.length --> $2
    } else {
      queryString += `AND owner_id = $${queryParams.length} `; //queryParams.length --> $2
    }
  }

  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    if (queryParams.length === 1) {
      queryString += `WHERE cost_per_night >= $${queryParams.length} `; //queryParams.length --> $3
    } else {
      queryString += `AND cost_per_night >= $${queryParams.length} `; //queryParams.length --> $3
    }
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    if (queryParams.length === 1) {
      queryString += `WHERE cost_per_night <= $${queryParams.length} `; //queryParams.length --> $4
    } else {
      queryString += `AND cost_per_night <= $${queryParams.length} `; //queryParams.length --> $4
    }
  }

  queryString += `\n  GROUP BY properties.id `;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length}`; //queryParams.length --> $5
  }

  //4 add 'limit parameter to query string
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `; //queryParams.length --> $2

  //5 check constructed string
  console.log(queryString, queryParams);

  //6 return promise
  return pool.query(queryString, queryParams).then(response => { return response.rows; });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};
exports.addProperty = addProperty;
