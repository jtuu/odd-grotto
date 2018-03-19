import "./App.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Room } from "./Room";
import { Lobby } from "./Lobby";
import { UsernameSetter } from "./UsernameSetter";
import  {BrowserRouter as Router, Route, Switch } from "react-router-dom";

interface AppProps{

}

interface AppState{
  username: string;
}

function getRandomUsername(): string {
  return `Guest#${Math.random().toFixed(5).slice(2)}`;
}

class App extends React.Component<AppProps, AppState>{
  private readonly basename = window.location.pathname;
  private readonly localStorageKey = "odd-grotto-app-state";

  constructor(props: AppProps) {
    super(props);
    const storedState = window.localStorage.getItem(this.localStorageKey);
    if (storedState) {
      this.state = JSON.parse(storedState);
    }else {
      this.state = {
        username: getRandomUsername()
      };
    }
  }

  public setState(state: AppState) {
    super.setState(state, () => {
      window.localStorage.setItem(this.localStorageKey, JSON.stringify(this.state));
    });
  }

  public render() {
    return (
      <React.Fragment>
        <Router basename={this.basename}>
          <Switch>
            <Route exact path="/" render={() => (
              <Lobby username={this.state.username}>
                <UsernameSetter username={this.state.username} onSetUsername={
                  newUsername => this.setState({username: newUsername})
                } />
              </Lobby>
            )} />
            <Route path="/:mode(play|watch)/:id/:name" render={props => (
              <Room username={this.state.username} {...props} />
            )} />
          </Switch>
        </Router>
      </React.Fragment>
    );
  }
}

export function render(root: Element) {
  ReactDOM.render((
    <App />
  ), root);
}
