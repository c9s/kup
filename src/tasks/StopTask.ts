import {SCRIPT_DIR, TEMPLATES_DIR} from "./Task";
import {Task} from "./Task";
import {Session, SessionResult, executeScript, sync} from "../Session";

export class StopTask extends Task {

  public describe() : string {
    return `Stop ${this.config.app.name}`;
  }

  public run(session : Session) : Promise<SessionResult> {
    return executeScript(session,
      this.resolveScript(session, 'service/stop'), {
        'vars': this.extendArgs({ })
      });
  }
}
