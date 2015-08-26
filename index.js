'use strict';

/** Dependencies */
var querystring = require('querystring'),
	request = require('request'),
	md5 = require('MD5'),
	async = require('async'),
	parseString = require('xml2js').parseString,
	Promise = require('promise'),
	_ = require('lodash');


/**
 * Debug mode for this module to run this from the command prompt.
 */
var debugMode = true;
var components = ['Base64', 'Clientmanager', 'Businessmanager', 'Employeemanager', 'Brandmanager', 'Rolemanager'];
var prefix = '[node-naiton] - ';

/**
 * =====================================================================================
 * Naiton client
 * =====================================================================================
 */

/**
 * Client
 * @param  {Object} options  Options object
 * @return {Client}          Returns itself
 */
var Client = function(options) {

	var defaults = {
		action: '',
		account: '',
		site_id: '',
		token: null,
		site_secure_code: '',
		env: 'production',
		returnType: 'object',
		userAgent: 'node-naiton-0.0.1',
		username: '',
		password: '',
		ipaddress: '',
		connectionstring: '',
		errors: {
			noresolve: 'There is no resolve defined, please define a resolve function.',
			noreject: 'There is no reject defined, please define a reject function.',
			notoken: 'There is no refresh token set, please authenticate using the function authenticate',
			nosuccessontoken: 'The credentials used to initialize the session are not correct.'
		},
		compression: '0',
		responseType: 'json'
	};

	var self = this;

	this.models = {};
	this.options = _.merge({}, defaults, options);

	if (this.options.env === 'test') {
		this.url = 'http://webservice.naiton.com';
	} else {
		this.url = 'http://webservice.naiton.com';
	}

	// Loop components from array
	components.forEach(function(component) {
		try {
			// Try to require the service file
			exports[component] = require('./components/' + component.toLowerCase())[component];
			self[component.toLowerCase()] = new exports[component](self);
		} catch (e) {
			// Cant be required, file probably doesn't exist
			console.log('Cant find file: ' + component + ' - ' + e);
		}
	});

	return this;
};


/**
 * Client constuctor
 * @param  {Object} options  Options object
 * @return {Client}          Returns a new instance of the Client object
 */
module.exports.createClient = function(options) {
	return new Client(options);
};

/**
 * =====================================================================================
 * POST system
 * =====================================================================================
 */

/**
 * Wrapper function for the POST requests
 * @param  {String}   path     Path to the resource
 * @param  {Object}   params   GET parameters
 * @param  {Function} callback Gets called after request is complete
 */
Client.prototype.post = function(body, resolve, reject) {
	var self = this;

	var req = request({
		url: this.url + this.options.action,
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Content-Length': Buffer.byteLength(body),
			'Connection': 'close'
		},
		encoding: 'utf-8',
		method: 'POST',
		body: body
	}, function(err, res, data) {
		var json = {};
		if (err) {
			reject(err);
		}

		if (debugMode) {
			console.log(prefix + 'post - request - ' + self.options.action);
		}

		switch (self.options.returnType) {
			case 'xml':
				parseString(data, function(err, parseResult) {
					json = parseResult;
				});
				break;
			case 'object':
				console.log(data);
				json = JSON.parse(data);
				break;
		}

		if (self.options.action === '/service/initializesession') {
			if (typeof json.success !== 'undefined') {
				self.options.token = json.success.token;
			} else {
				reject(self.options.errors.nosuccessontoken);
			}
		}
		resolve(data);
	});

}

/**
 * =====================================================================================
 * Authentication
 * =====================================================================================
 */

/**
 * Authenticate a set the token internally.
 * @param {Function} callback Gets called after request is complete
 */
Client.prototype.authenticate = function() {
	var body,
		self = this;

	// Server action.
	this.options.action = '/service/initializesession';

	// Body content
	body = '' +
		'<_routines>' +
		'<_routine>' +
		'<_name>InitializeSession</_name>' +
		'<_arguments>' +
		'<login>' + this.base64.encode(this.options.username) + '</login>' +
		'<password>' + this.options.password + '</password>' +
		'<ipaddress>' + this.base64.encode(this.options.ipaddress) + '</ipaddress>' +
		'<timeout>20</timeout>' +
		'<connectionstring>' + this.base64.encode(this.options.connectionstring) + '</connectionstring>' +
		'</_arguments>' +
		'<_options>' +
		'<_encoding field="login" isentry="1">1</_encoding>' +
		'<_encoding field="password" isentry="1">0</_encoding>' +
		'<_encoding field="ipaddress" isentry="1">1</_encoding>' +
		'<_encoding field="connectionstring" isentry="1">1</_encoding>' +
		'</_options>' +
		'</_routine>' +
		'<_returnType>json</_returnType>' +
		'</_routines>';

	// Return a new promise.
	return new Promise(function(resolve, reject) {
		self.post(body, resolve, reject);
	});

};

/**
 * =====================================================================================
 * Global function to check if calling a module function is properly done.
 * =====================================================================================
 */

/**
 * Get a list of brands with a primary key.
 * @param {Function} callback Gets called after request is complete
 */
Client.prototype.verifyAPIUsage = function(prefix, resolve, reject) {
	if (typeof resolve === 'undefined' || resolve === null) {
		console.log(prefix + this.options.errors.noresolve);
		return false;
	} else if (typeof reject === 'undefined' || reject === null) {
		console.log(prefix + this.options.errors.noreject);
		return false;
	} else {
		return true;
	}
};

/**
 * =====================================================================================
 * Debug mode
 * =====================================================================================
 */

// Debug mode
if (debugMode) {
	var newClient = module.exports.createClient({
		env: 'test'
	});

	var mongoose = require('mongoose'),
		naitonClient = require('./models/naitonclient'),
		NaitonClient = mongoose.model('NaitonClient');

	newClient.authenticate().then(function(result) {

			// Get country list.
			async.waterfall([

				function(cb) {
					console.log('Waterfall start');
					newClient.clientmanager.getcountrylist(function(result) {
						console.log('Get country list');
						cb(result);
					}, function(error) {
						console.log(error);
						//cb(null);
					});
				},
				function(countrylist, cb) {

					console.log(countrylist);

					var client = new NaitonClient({
						clientid: 0,
						firstname: 'Gerhard Richard',
						infix: '',
						lastname: 'Edens',
						gender: true,
						dateofbirth: new Date(),
						phone: '+31 (0)6 55 33 79 88',
						email: 'richard+10@aanzee.nl',
						password: 'nmjKli8',
						allownewsletter: true,
						addressid: 0,
						house: '19',
						houseadd: '',
						zipcode: '2202MN',
						city: 'Noordwijk',
						countryid: 1,
						businessid: 611,
						companyid: 0,
						discountgroupid: 0,
						paymentdays: 0,
						creditline: 0,
						emailblacklist: true,
						returnvalue: ''
					});

					newClient.clientmanager.addclient(client, function(result) {
						console.log(result);
						cb();
					}, function(error) {
						console.log(error);
						cb();
					});

				}
			], function() {
				console.log('Last action... done here.');
			});

		},
		function(error) {
			console.log(error);
		});

}