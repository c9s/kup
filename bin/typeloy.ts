#!/usr/bin/env node
import path = require('path');
import fs = require('fs');
import {readConfig, Config} from '../src/config';

import { BaseAction, DeployAction, SetupAction, StartAction, RestartAction, StopAction, LogsAction} from '../src/actions';



import {CmdDeployOptions} from '../src/options';
import {SessionManager, SessionGroup, SessionsMap} from '../src/SessionManager';
import {SummaryMap,SummaryMapResult, SummaryMapHistory, haveSummaryMapsErrors, hasSummaryMapErrors} from "../src/SummaryMap";

import {Deployment} from '../src/Deployment';
import debug from '../src/Debug';

require('colors');

var prog = require('commander');

var version = '1.3.0';
var cwd = path.resolve('.');

prog.version(version);
prog.usage('[options] <subcommand> ...');
prog.option('-v, --verbose', 'verbose mode');
prog.option('-c, --config <file>', 'config file');





prog.command('deploy [sites...]')
  .description('set the deployment tag and start deploying.')
  .option("-d, --dryrun", 'do not really deploy it.')
  .option("--bundle-file <file>", 'the bundle file you have already built with meteor build.')
  .option("--build-dir <dir>", 'the meteor build directory.')
  .option("--tag <tag>", 'deployment tag')
  .option("-C, --no-clean", 'whether to clean up the bundle files.')
  .action((sites : Array<string>, options : CmdDeployOptions) => {
    let config = readConfig(prog.config);


    let a = new DeployAction(config);
    let deployment = Deployment.create(config, config.app.root || cwd, options.tag);
    let afterDeploy = a.run(deployment, sites, options);
    afterDeploy.then((mapResult : Array<SummaryMap>) => {
      var errorCode = haveSummaryMapsErrors(mapResult) ? 1 : 0;
      console.log("returned code", errorCode);
      // console.log("After deploy", mapResult);
      // console.log(JSON.stringify(mapResult, null, "  "));
    });
    afterDeploy.catch( (res) => {
      console.error(res);
    });
  })
  ;

prog.command('setup [sites...]')
  .description('setup the requirements on the target server.')
  .action((sites : Array<string>, options) => {
    let config = readConfig(prog.config);
    let a = new SetupAction(config);

    let deployment = Deployment.create(config, config.app.root || cwd);
    a.run(deployment, sites);
  })
  ;

prog.command('logs [sites...]')
  .description('tail the logs')
  .option("-f, --tail", 'tail')
  .option("--init <init>", 'init type, could be "systemd".')
  .action((sites, options) => {
    let config = readConfig(prog.config);
    let a = new LogsAction(config);
    let deployment = Deployment.create(config, config.app.root || cwd);
    a.run(deployment, sites, options);
  });

prog.command('start [site]')
  .description('start the app.')
  .action( (site, options) => {
    let config = readConfig(prog.config);
    let actions = new StartAction(config);

    let deployment = Deployment.create(config, config.app.root || cwd);
    actions.run(deployment, site);
  });
  ;

prog.command('stop [site]')
  .description('stop the app.')
  .action((site, options) => {
    let config = readConfig(prog.config);
    let actions = new StopAction(config);

    let deployment = Deployment.create(config, config.app.root || cwd);
    actions.run(deployment, site);
  });
  ;

prog.command('restart')
  .description('restart the app.')
  .action((site, options) => {
    let config = readConfig(prog.config);
    let actions = new RestartAction(config);

    let deployment = Deployment.create(config, config.app.root || cwd);
    actions.run(deployment, site);
  });
  ;

prog.command('init')
  .description('init the mup.json config.')
  .action( (env, options) => {
    let config = readConfig(prog.config);
    let actions = new BaseAction(config);
    actions.init();
  });


/*
// handling undefined command
prog.command('*')
  .action(function(env){
    console.log('deploying "%s"', env);
  });
*/

prog.on('--help', function(){
  /*
  console.log('  Examples:');
  console.log('');
  console.log('    $ custom-help --help');
  console.log('    $ custom-help -h');
  console.log('');
  */
});
prog.parse(process.argv);
