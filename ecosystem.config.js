module.exports = {
  apps: [
    {
      name: "poppop-backend",
      script: "app.js",
      watch: true,
      instances: 0,
      exec_mode: "cluster",
      exec_interpreter: "node",
    },
  ],
};
