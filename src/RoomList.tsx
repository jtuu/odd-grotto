import * as firebase from "firebase";
import * as React from "react";
import { firebaseService } from "./FirebaseService";
import { Bind } from "./Decorators";
import { Link } from "react-router-dom";
import { ListGroup, ListGroupItem, Button } from "reactstrap";

interface RoomListProps {

}

interface RoomListEntry {
  id: string;
  name: string;
}

interface RoomListState {
  rooms: RoomListEntry[];
}

export class RoomList extends React.Component<RoomListProps, RoomListState> {
  private roomsRef!: firebase.database.Reference;
  private initialRoomsReceived = false;

  public state: RoomListState = {
    rooms: []
  };

  constructor(props: RoomListProps) {
    super(props);
  }

  @Bind
  private onInitialState(roomListSnap: firebase.database.DataSnapshot) {
    let i = 0;
    const rooms: RoomListEntry[] = [];
    roomListSnap.forEach(roomSnap => {
      rooms[i++] = {
        id: String(roomSnap.key),
        name: roomSnap.child("name").val()
      };
      return false;
    });
    this.setState({
      rooms
    });

    this.initialRoomsReceived = true;
  }

  @Bind
  private onRoomAdded(room: firebase.database.DataSnapshot | null) {
    if (this.initialRoomsReceived && room) {
      this.setState({rooms: this.state.rooms.concat({
        id: String(room.key),
        name: room.child("name").val()
      })});
    }
  }

  @Bind
  private onRoomRemoved(room: firebase.database.DataSnapshot | null) {
    if (room) {
      const name = room.child("name").val();
      this.setState({rooms: this.state.rooms.filter(r => r.name !== name)});
    }
  }

  public componentDidMount() {
    this.roomsRef = firebaseService.database.ref("rooms");
    this.roomsRef.on("child_added", this.onRoomAdded);
    this.roomsRef.on("child_removed", this.onRoomRemoved);
    this.roomsRef.once("value", this.onInitialState);
  }

  public componentWillUnmount() {
    this.roomsRef.off();
  }

  public render() {
    const buttonStyle = {
      width: "4.5rem"
    };

    let listContents: JSX.Element | JSX.Element[];

    if (this.state.rooms.length < 1) {
      listContents = <em style={{textAlign: "center"}}>None!</em>;
    } else {
      listContents = this.state.rooms.map(room => {
        const encodedId = encodeURIComponent(room.id);
        const encodedName = encodeURIComponent(room.name);
        return (
          <ListGroupItem action key={room.id} className="p-1 pl-3">
            <strong style={{marginRight: "1rem"}}>{room.name}</strong>
            <Link to={`/play/${encodedId}/${encodedName}`}>
              <Button outline color="info" className="p-0" style={buttonStyle}>
                Play
              </Button>
            </Link>
            {" "}
            <Link to={`/watch/${encodedId}/${encodedName}`}>
              <Button outline color="primary" className="p-0" style={buttonStyle}>
                Watch
              </Button>
            </Link>
          </ListGroupItem>
        );
      });
    }

    return (
      <div style={{minHeight: "86%"}}>
        <div style={{textAlign: "center"}}>Games currently running:</div>
        <ListGroup>{listContents}</ListGroup>
      </div>
    );
  }
}
