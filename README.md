# Reamaze Exporter

Utility built from scratch to export all data from [reamaze.io/api](https://www.reamaze.com/api)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

It's recommended that you have the following system requirements:

```txt
NodeJS v8.9.3
npm v6.1.0
```

### Installing

Follow these steps to run the reamaze exporter utility

* Colone the repo `git clone https://github.com/oiramalli/reamaze-exporter.git`.
* CD into the directory `cd reamaze-exporter`
* Run `npm i`.
* Create a `local.js` file under the config folder with the following structure:

```javascript
module.exports = {
  example_brand: {
    protocol : 'https://',
    hostname : 'example_brand.reamaze.io',
    username : 'admin@example.com',
    authToken: '1234509876',
  }
};
```

* Run `node cli.js collect -b {brand}` to begin collecting all the data.
* Sit, wait and enjoy.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).
