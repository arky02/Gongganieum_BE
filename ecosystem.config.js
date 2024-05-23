module.exports = {
  apps: [
    {
      name: "poppop-backend",
      script: "app.js",
      instances: 1,
      exec_mode: "cluster",
      exec_interpreter: "node",
    },
  ],
};
