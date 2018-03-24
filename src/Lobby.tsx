import * as React from "react";
import { RoomList } from "./RoomList";
import { firebaseService } from "./FirebaseService";
import { Bind } from "./Decorators";
import * as firebase from "firebase";
import { Redirect } from "react-router-dom";
import { Button } from "reactstrap";
<<<<<<< HEAD
import * as branding from "./branding.json";

interface LobbyProps {
  username: string;
}

interface LobbyState {
  navigatingToNewRoom: boolean;
}

export class Lobby extends React.Component<LobbyProps, LobbyState> {
=======

interface LobbyProps{
  username: string;
}

interface LobbyState{
  navigatingToNewRoom: boolean;
}

export class Lobby extends React.Component<LobbyProps, LobbyState>{
>>>>>>> c47c0c45ce7672a7abd9b330450138222d348e21
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
<<<<<<< HEAD
      } else {
=======
      }else {
>>>>>>> c47c0c45ce7672a7abd9b330450138222d348e21
        console.error("Navigating to new room failed");
      }
    }

    return (
<<<<<<< HEAD
      <div style={{height: "100%"}}>
=======
      <div>
>>>>>>> c47c0c45ce7672a7abd9b330450138222d348e21
        <div style={{padding: "0.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between"}}>
          <div>
            <h3>Welcome to Odd Grotto!</h3>
            <Button onClick={this.createNewRoom} color="success" size="lg">Play</Button>
          </div>
          {this.props.children}
        </div>
        <RoomList />
<<<<<<< HEAD
        <footer style={{textAlign: "center"}}>
          <a href={branding.github} style={{marginRight: "1rem"}}>Odd Grotto on Github</a>
          <a href={branding.discord}>Join the community on Discord</a>
        </footer>
=======
>>>>>>> c47c0c45ce7672a7abd9b330450138222d348e21
      </div>
    );
  }
}
