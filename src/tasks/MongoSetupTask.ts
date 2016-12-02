import {SCRIPT_DIR, TEMPLATES_DIR} from "./Task";
import {SetupTask} from "./SetupTask";
import {Session, SessionResult, executeScript} from "../Session";

const fs = require('fs');
const path = require('path');
const util = require('util');

export class MongoSetupTask extends SetupTask {

  public describe() : string {
    return 'Setting up MongoDB configuration';
  }

  public run(session : Session) : Promise<SessionResult> {
    return executeScript(session, this.resolveScript(session, 'mongo-install.sh'));
  }
}
