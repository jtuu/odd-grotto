import * as React from "react";
import { ListGroup, ListGroupItem, UncontrolledTooltip } from "reactstrap";
import { ConnectionStatus } from "./WebRTCMultiConnector";
import { Bind } from "./Decorators";
import "./UserList.css";

export interface User{
  id: string;
  name: string;
  connectionStatus: ConnectionStatus;
}

interface UserListProps{
  ownId: string;
  users: User[];
}

export class UserList extends React.Component<UserListProps>{
  constructor(props: UserListProps) {
    super(props);
  }

  @Bind
  private renderUser(user: User): React.ReactNode {
    const tooltipId = `user-${user.id}`;
    let tooltipText: string;
    let statusClass: string = "";

    if (user.id === this.props.ownId) {
      tooltipText = "That's you";
      statusClass = "you";
    }else {
      switch (user.connectionStatus){
        default:
        case ConnectionStatus.Unknown:
          tooltipText = "Unknown status: " + user.connectionStatus;
          break;
        case ConnectionStatus.Disconnected:
          tooltipText = "Not connected";
          statusClass = "disconnected";
          break;
        case ConnectionStatus.Connecting:
          tooltipText = "Connecting";
          statusClass = "connecting";
          break;
        case ConnectionStatus.Connected:
          tooltipText = "Connected";
          statusClass = "connected";
          break;
        case ConnectionStatus.Failed:
          tooltipText = "Connection failed";
          statusClass = "failed";
          break;
      }
    }

    return (
      <React.Fragment key={user.id}>
        <ListGroupItem className="p-1 pl-3" id={tooltipId}>
          <span className={"status-indicator " + statusClass}>{user.name}</span>
        </ListGroupItem>
        <UncontrolledTooltip autohide={false} placement="top" target={tooltipId} delay={{show: 250, hide: 0}}>
          {tooltipText}
        </UncontrolledTooltip>
      </React.Fragment>
    );
  }

  public render() {
    return (
      <ListGroup style={{maxHeight: "5rem", overflowY: "auto"}}>{
        this.props.users.map(this.renderUser)
      }</ListGroup>
    );
  }
}
