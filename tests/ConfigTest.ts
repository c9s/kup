import chai = require('chai');
var expect = chai.expect;

import {ConfigParser} from "../src/config";

describe('Config', () => {
  describe('#parse', () => {

    it('should parse new sites config', () => {
      let config = ConfigParser.parse('tests/data/typeloy-sites.json');
      expect(config.sites).to.be.not.null;
      expect(config.sites['dev']).to.be.not.null;
    });

    it('should parse legacy mup.json', () => {
      let config = ConfigParser.parse('tests/data/mup.json');
      expect(config.sites['default']).to.be.ok;
      expect(config.deploy.checkDelay).to.equal(120);
      expect(config.setup.nodeVersion).to.equal('0.10.44');
      expect(config.setup.phantom).to.be.true;
      expect(config.setup.mongo).to.be.true;
    });
  });
});
