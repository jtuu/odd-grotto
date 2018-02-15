const devEnv = process.env.FUSEBOX_ENV === "dev";
const prodEnv = !devEnv;

const {
	FuseBox,
  QuantumPlugin,
	WebIndexPlugin
} = require("fuse-box");
const fuse = FuseBox.init({
	homeDir: "src",
	target: "browser@esnext",
	output: "public/$name.js",
	plugins: [
		WebIndexPlugin({
      path: ".",
      template: "src/index.html"
    }),
    prodEnv && QuantumPlugin()
	],
  log: devEnv,
  debug: devEnv
});

const bundle = () => fuse.bundle("app").instructions(" > main.ts");

if(devEnv){
  fuse.dev({
    port: 3000
  });
  bundle().hmr().watch();
}else{
  bundle();
}

fuse.run();
