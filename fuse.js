const devEnv = process.env.FUSEBOX_ENV === "dev";
const prodEnv = !devEnv;

const {
	FuseBox,
  QuantumPlugin,
	WebIndexPlugin,
	JSONPlugin,
	BabelPlugin,
	UglifyESPlugin,
	CSSPlugin
} = require("fuse-box");
const {MacroPlugin} = require("./lib/MacroPlugin");
const {basename} = require("path");
const package = require("./package");

const mainFileName = basename(package.main);

const fuse = FuseBox.init({
	package: {
		name: package.name,
		entry: mainFileName
	},
	homeDir: "src",
	target: "browser@es2017",
	output: "public/$name.js",
	allowSyntheticDefaultImports: true,
	plugins: [
		JSONPlugin(),
		CSSPlugin(),
		
		MacroPlugin({
			defineFilePath: "lib/defines.m4",
			ignoreFiles: [
				"Assert.ts",
				"Globals.ts"
			]
		}),
		
		BabelPlugin({
			config: {
				sourceMaps: true,
				presets: ["es2017", "stage-3"],
				plugins: [
					"transform-react-jsx"
				]
			},
			test: /\.tsx?$/,
			extensions: [".js"]
		}),
		WebIndexPlugin({
      path: ".",
      template: "src/index.html"
    }),
    prodEnv && QuantumPlugin({
			ensureES5: false
		}),
		prodEnv && UglifyESPlugin()
	],
  log: devEnv,
  debug: devEnv
});

const bundle = name => fuse.bundle(name).instructions(` > ${name}.ts`);
const bundleGlobals = () => bundle("Globals").globals({[package.name]: "*"});
const bundleMain = () => bundle("main");

if(devEnv){
  fuse.dev({
    port: 3000
  });
	bundleGlobals().hmr().watch();
	bundleMain().hmr().watch();
}else{
	bundleGlobals();
  bundleMain();
}

fuse.run();