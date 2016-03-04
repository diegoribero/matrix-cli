require('./matrix-init');

var debug = debugLog('sim');

var program = require('commander');

program
  .parse(process.argv);

var pkgs = program.args;

var cmd = pkgs[0];

if (_.isEmpty(cmd)) {
  showHelp();
}

if ( _.isUndefined( Matrix.config.user.id )){
  return console.log('Please','matrix login'.grey, 'before attempting to use the simulator');
}

if (cmd === 'init') {

  if ( _.has( Matrix.config, 'sim.id' )){
    console.log('You already have a virtual device initialized.');
    console.log('\nTo target this device:\n');
    console.log('matrix use %s'.grey, Matrix.config.sim.id);
    process.exit();
  }
  // make sure device name, device id and userId are available
  var deviceId = 'sim-' + _.times(24, function() {
    return Math.round(Math.random() * 16).toString(16)
  }).join('');

  debug(deviceId);

  var prompt = require('prompt');

  prompt.delimiter = '';

  prompt.message = 'Please enter information for this virtual device\n';
  prompt.start();

  prompt.get(['name', 'description'], function(err, results) {
    if (err) return console.error(err);

    // check for dupe name, note, this requires matrix list devices to have run

    _.each( Matrix.config.deviceMap, function (d) {
        if (results.name === d.name ){
          console.error(d.name ,'is already used');
          process.exit();
        }
    })

    results.deviceId = deviceId;
    console.log('Creating', results.name, '[' + deviceId + ']')
    Matrix.api.device.create(results, function(err, results) {
      if (err) return console.error('Create Error', err);
      console.log('Device Created'.blue)
      debug(results);
      Matrix.api.device.register( deviceId, function(err, results){
        if (err) return console.error('Register Error', err);
        console.log('Device Registered'.blue)
        debug(results);
        Matrix.config.sim = {
          token: results.results.device_token,
          id: deviceId
        }
        Matrix.helpers.saveConfig();

        console.log('Success'.green)
        console.log('\nTo target this device:\n');
        console.log('matrix use %s'.grey, Matrix.config.sim.id);
      });
    });
  });

} else if (cmd === 'start') {
  var option = pkgs[1];

  //test for docker
  try {
    var proc = require('child_process').execSync('which docker', {
      stdio: [null, null, null]
    });
  } catch (e) {
    if (e.toString().indexOf('Command failed') > -1) {
      console.error('Docker not found.'.red, '\nPlease install docker from https://docs.docker.com/engine/installation/ ')
      process.exit(1);
    }
  }

  var dockerEnvs = _.pick(process.env, ['DOCKER_TLS_VERIFY', 'DOCKER_HOST', 'DOCKER_CERT_PATH', 'DOCKER_MACHINE_NAME']);

  // MATRIX_DEVICE_ID='12:23:34:45:56' -e MATRIX_DEVICE_NAME='really. go away' -e DEBUG='*,-engine*' -e 'MATRIX_USER=brian@rokk3rlabs.com'  admobilize/matrix-os
  var proc = require('child_process').exec('docker run ' + [
    ( option === 'debug' ) ? '-e DEBUG="*,-engine*"' : '',
    '-e MATRIX_DEVICE_ID="' + Matrix.config.device.identifier + '"',
    '-e MATRIX_USER="' + Matrix.config.user.username + '"',
    'admobilize/matrix-os'
  ].join(' '), {}, function(err, out, stderr) {
    // if (err) console.error('ERROR'.red, err);
    if (stderr) console.error('ERROR'.red, stderr);
    console.log(out);
  })


  proc.stdout.on('data', function(data) {
    // console.log(data);
  });

  proc.stderr.on('data', function(data) {
    // console.log('ERROR'.red, data);
  });

  proc.on('error', function(err) {
    // console.error('ERROR'.red, err, proc);
  })
} else if ( cmd === 'clear'){
  Matrix.config.sim = null;
  Matrix.helpers.saveConfig();
} else {
  showHelp();
}


function showHelp(){
  console.log('\n> matrix sim ¬\n');
  console.log('\t                  matrix sim init -', 'initialize your MatrixOS simulator'.grey)
  console.log('\t                 matrix sim start -', 'start MatrixOS virtual environment'.grey)
  console.log('\t                  matrix sim save -', 'save MatrixOS state, use after deploy / install'.grey)
  console.log('\t                 matrix sim reset -', 'find matrix apps'.grey)
  console.log('\n')
  process.exit(1);
}
