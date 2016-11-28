import {ServerConfig} from "./config";
import {SummaryMap, SummaryMapResult, SummaryMapHistory} from "./SummaryMap";
import {Task} from "./tasks";

const ejs = require('ejs');
const fs = require('fs');

const _ = require('underscore');

/*
Session {
  _host: '...',
  _auth: { username: 'root', password: '...' },
  _options:
   { ssh: { agent: '....' },
     keepAlive: true },
  _keepAlive: true,
  _tasks: [],
  _callbacks: [],
  _debug: { [Function: disabled] enabled: false },
  _serverConfig:
   { host: '....',
     username: 'root',
     password: '...',
     env:
      { ROOT_URL: 'http://site.com',
        CLUSTER_ENDPOINT_URL: 'http://111.222.11.22:80' },
     sshOptions: { agent: '/tmp/ssh-RcgKVIGk8tfL/agent.4345' },
     os: 'linux' } }
*/
export interface Session {

  _serverConfig : ServerConfig;

  _host : string;

  _auth : any;

  _keepAlive : boolean;


  /**
   * copy data from src to dest
   */
  copy(src, dest, options, callback?)

  download(src, dest, options, callback?)

  /**
   * execute shell command on remote server
   */
  execute(shellCommand, options, callback?)

  /**
   * execute script on remote server
   */
  executeScript(scriptFile, options, callback?)


  /**
   * close the connection.
   */
  close()
}

export type SessionCallback = (err, code, context) => void;

export interface SessionResultContext {
  stdout : string;
  stderr : string;
}

export interface SessionResult {
  error : boolean;

  status? : string;
  task? : string;

  code? : number;
  context? : SessionResultContext;

  // variables from task
  vars? : any;
}

export interface SessionDownloadOptions {
  progressBar? : boolean;
}

export interface SessionCopyOptions {
  progressBar? : boolean;
  vars? : any;
}


export class SessionRunner {

  protected summaryMap : SummaryMap;

  constructor() {
    this.summaryMap = {};
  }

  protected pushResult(session : Session, result : SessionResult, extend = null) {
    if (typeof this.summaryMap[session._host] === "undefined") {
      this.summaryMap[session._host] = { "error": false, "history": [] };
    }
    if (result.error) {
      result.status = "FAILED";
    } else {
      result.status = "SUCCESS";
    }
    if (extend) {
      result = _.extend(result, extend);
    }
    this.summaryMap[session._host].history.push(result);
  }

  public execute(session : Session, tasks : Array<any>, input : any) : Promise<SummaryMap> {
    let done = Promise.resolve(input);
    _.each(tasks, (t) => {
        if (t instanceof Array) {
            done = done.then(i => {
                const all = _.map(t, (subt : Task) => subt.input(i).run(session).then((result : SessionResult) => {
                  this.pushResult(session, result);
                }));
                return Promise.all(all);
            });
        } else {
            done = done.then(i => {
              return t.input(i).run(session);
            }).then((result : SessionResult) => {
              this.pushResult(session, result, { "task": t.describe() });
              return Promise.resolve(result);
            });
        }
    });
    return done;
  }

}


/**
 * A private helper function that collects callback results into a summary map.
 */
function wrapSessionCallbackPromise(session : Session, resolve, callback? : SessionCallback, vars? : any) : SessionCallback {
  // the parent caller
  // callback(null, context.code, context);
  return (err, code, context : SessionResultContext) : void => {
    if (callback) {
      callback.call(this, err, code, context);
    }
    resolve({
      error: err,
      code,
      context,
      vars
    } as SessionResult);
  };
}


/*
Helper function for returning result



Return result directly:

  import {result} from "./Session";

  public run(session : Session) : Promise<SessionResult> {
    return result(false, { filename: '...' });
  }

Return result inside another Promise:

  import {result} from "./Session";

  public run(session : Session) : Promise<SessionResult> {
    return new Promise<SessionResult>((input)=> {
      // do something
      return result(false, { filename: '...' });
    });
  }

Return result with Session tasks

  import {result} from "./Session";

  public run(session : Session) : Promise<SessionResult> {
    const destFile = ......;
    const download = download(session, srcFile, destFile);
    return download.then(input => result(false, destFile));
  }

 */
export function result(error : boolean, vars, input = null) : Promise<SessionResult> {
  let res = { error, vars };
  if (input) {
    res = _.extend(input, res);
  }
  return Promise.resolve(res);
}


export function download(session : Session, remoteFile : string, localFile : string, options : SessionDownloadOptions, callback? : SessionCallback) : Promise<SessionResult> {
  return new Promise<SessionResult>(resolve => {
    session.download(remoteFile, localFile, options, wrapSessionCallbackPromise(session, resolve, callback));
  });
}

export function copy(session : Session, localFile : string, remoteFile : string, options : SessionCopyOptions, callback? : SessionCallback) : Promise<SessionResult> {
  return new Promise<SessionResult>(resolve => {
    session.copy(localFile, remoteFile, options, wrapSessionCallbackPromise(session, resolve, callback));
  });
}

export function execute(session : Session, shellCommand : string, options : Object, callback ?: SessionCallback) : Promise<SessionResult> {
  return new Promise<SessionResult>(resolve => {
    session.execute(shellCommand, options, wrapSessionCallbackPromise(session, resolve, callback));
  });
}



/**
 * sync an array of promise
 *
 * vars: result variables pass to the next task
 */
function syncPromises(taskPromises : Array<Promise<SessionResult>>) : Promise<SessionResult> {
  let t = Promise.resolve()
  for (let i = 0; i < taskPromises.length ; i++) {
    t = t.then((result : SessionResult) => {
      return taskPromises[i];
    });
  }
  return t;
}

export function sync(...tasks : Array<any>) : Promise<SessionResult> {
  if (tasks[0] instanceof Array) {
    return syncPromises(tasks[0] as Array<Promise<SessionResult>>);
  }
  return syncPromises(tasks as Array<Promise<SessionResult>>);
}

/**
 * A promise compliant wrapper for executeScript method.
 */
export function executeScript(session : Session, script : string, options? : Object, callback? : SessionCallback) : Promise<SessionResult> {
  return new Promise<SessionResult>(resolve => {
    session.executeScript(script, options || {}, wrapSessionCallbackPromise(session, resolve, callback));
  });
}


// data[key] = ejs.compile(value)(vars);


const applyTemplate = function(file, vars, callback) {
  fs.readFile(file, {encoding: 'utf8'}, (err, content) => {
    if (err) {
      callback(err);
    } else {
      const ejsOptions = {};
      const newContent = ejs.compile(content, ejsOptions)(vars || {});
      callback(null, newContent);
    } 
  });
};
