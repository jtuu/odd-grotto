import * as React from "react";
import { InputGroup, InputGroupAddon, Input, Button, UncontrolledTooltip } from "reactstrap";
import { Bind } from "./Decorators";

interface UsernameSetterProps {
  username: string;
  onSetUsername(newUsername: string): void;
}

interface UsernameSetterState {
  inputValue: string;
}

export class UsernameSetter extends React.Component<UsernameSetterProps, UsernameSetterState> {
  private static tooltipIdCounter = 0;
  private tooltipId = `UsernameSetter-Tooltip-${UsernameSetter.tooltipIdCounter++}`;

  public state: UsernameSetterState;

  constructor(props: UsernameSetterProps) {
    super(props);
    this.state = {
      inputValue: props.username
    };
  }

  @Bind
  private handleInputChange(e: React.ChangeEvent<any>) {
    this.setState({inputValue: e.target.value});
  }

  @Bind
  private handleSubmit() {
    this.props.onSetUsername(this.state.inputValue);
  }

  public render() {
    return (
      <InputGroup size="sm" style={{width: "25%", minWidth: "10rem"}}>
        <InputGroupAddon addonType="prepend" id={this.tooltipId}>
          <Button onClick={this.handleSubmit}>@</Button>
        </InputGroupAddon>
        <UncontrolledTooltip target={this.tooltipId} placement="bottom">
          Change username
        </UncontrolledTooltip>
        <Input placeholder="username" value={this.state.inputValue} onChange={this.handleInputChange} />
      </InputGroup>
    );
  }
}
