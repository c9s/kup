import {GitRevCollector, GitRevInfo} from "./collectors";

import {Config} from "./config";

export class Deployment {

  /**
   * typeloy config
   */
  public config : Config;

  /**
   * deployment tag
   */
  public tag : string;

  public revInfo : GitRevInfo;


  constructor(config : Config, tag : string, revInfo : GitRevInfo = null) {
    this.config = config;
    this.tag = tag;
    this.revInfo = revInfo;
  }

  public brief() {
    let o = {
      deployment: this.tag
    };
    if (this.revInfo) {
      o['latestTag'] = this.revInfo.latestTag;
      o['describe'] = this.revInfo.describe;
      if (this.revInfo.commits && this.revInfo.commits.length > 0) {
        let commit = this.revInfo.commits[0];
        o['commit'] = commit.hash;
        o['author'] = commit.author.name;
        o['committedAt'] = commit.date.toLocaleString();
      }
    }
    return o;
  }

  /**
   * @param dir dir is used for git collector to collect information
   */
  public static create(config : Config, dir:string, tag:string = null) : Deployment {
    let revInfo = GitRevCollector.collect(dir);
    if (!tag) {
      tag = revInfo.describe;
    }
    return new Deployment(config, tag, revInfo);
  }
}
