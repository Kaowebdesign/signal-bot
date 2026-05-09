const FtpDeploy = require("ftp-deploy");
require("dotenv").config({ path: ".env.deploy" });

const ftp = new FtpDeploy();

const config = {
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  host: process.env.FTP_HOST,
  port: process.env.FTP_PORT || 21,
  localRoot: __dirname + "/apps/web/dist/",
  remoteRoot: process.env.FTP_REMOTE_ROOT || "/public_html/",
  include: ["*", "**/*", ".htaccess"],
  deleteRemote: true,
};

console.log(`Deploying to ${config.host}${config.remoteRoot} ...`);

ftp
  .deploy(config)
  .then(() => console.log("Deploy complete!"))
  .catch((err) => {
    console.error("Deploy failed:", err);
    process.exit(1);
  });
