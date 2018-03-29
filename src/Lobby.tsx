import * as React from "react";
import { RoomList } from "./RoomList";
import { firebaseService } from "./FirebaseService";
import { Bind } from "./Decorators";
import * as firebase from "firebase";
import { Redirect } from "react-router-dom";
import { Button } from "reactstrap";
import * as branding from "./branding.json";

interface LobbyProps {
  username: string;
}

interface LobbyState {
  navigatingToNewRoom: boolean;
}

export class Lobby extends React.Component<LobbyProps, LobbyState> {
  private newRoomRef!: firebase.database.Reference;
  private newRoomName: string | undefined;
  public state = {
    navigatingToNewRoom: false
  };

  constructor(props: LobbyProps) {
    super(props);
  }

  public componentDidMount() {
    document.title = "Odd Grotto";
    this.newRoomRef = firebaseService.database.ref("rooms").push();
  }

  @Bind
  private createNewRoom() {
    this.newRoomName = this.props.username;
    this.newRoomRef.child("name").set(this.newRoomName);
    this.setState({navigatingToNewRoom: true});
  }

  public render() {
    if (this.state.navigatingToNewRoom) {
      if (this.newRoomRef.key && this.newRoomName) {
        return (
          <Redirect
            to={`/play/${encodeURIComponent(this.newRoomRef.key)}/${encodeURIComponent(this.newRoomName)}`}
            push={true}
          />
        );
      } else {
        console.error("Navigating to new room failed");
      }
    }

    return (
      <div style={{height: "100%"}}>
        <div style={{padding: "0.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between"}}>
          <div>
            <h3>Welcome to Odd Grotto!</h3>
            <Button onClick={this.createNewRoom} color="success" size="lg">Play</Button>
          </div>
          {this.props.children}
        </div>
        <RoomList />
        <footer style={{textAlign: "center"}}>
          <a href={branding.github} style={{marginRight: "1rem"}}>Odd Grotto on Github</a>
          <a href={branding.discord}>Join the community on Discord</a>
        </footer>
      </div>
    );
  }
}
