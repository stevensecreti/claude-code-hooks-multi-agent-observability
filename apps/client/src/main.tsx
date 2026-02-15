import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "./theme";
import { ColorModeProvider } from "./components/ui/color-mode";
import { Toaster } from "./components/ui/toaster";
import App from "./App";
import "./styles/themes.css";
import "./styles/main.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ChakraProvider value={system}>
			<ColorModeProvider>
				<App />
				<Toaster />
			</ColorModeProvider>
		</ChakraProvider>
	</React.StrictMode>,
);
