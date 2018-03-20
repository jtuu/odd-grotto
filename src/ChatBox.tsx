import * as React from "react";
import { Bind } from "./Decorators";
import { Input, ListGroup, ListGroupItem } from "reactstrap";

export interface ChatMessage {
  id: string;
  date: Date;
  sender: string;
  text: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onMessageSend(msg: string): void;
}

interface ChatBoxState {
  inputValue: string;
}

export class ChatBox extends React.Component<ChatBoxProps, ChatBoxState> {
  private scrollDummyElement: HTMLDivElement | undefined;

  public state = {
    inputValue: ""
  };

  constructor(props: ChatBoxProps) {
    super(props);
  }

  @Bind
  private handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({inputValue: e.target.value});
  }

  @Bind
  private handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = this.state.inputValue;
    if (text) {
      this.props.onMessageSend(text);
      this.setState({inputValue: ""});
    }
  }

  private scrollToBottom() {
    if (this.scrollDummyElement) {
      this.scrollDummyElement.scrollIntoView({behavior: "smooth"});
    }
  }

  public componentDidMount() {
    this.scrollToBottom();
  }

  public componentDidUpdate() {
    this.scrollToBottom();
  }

  public render() {
    return (
      <div>
        <ListGroup className="messages" flush style={{maxHeight: "20rem", overflowY: "auto"}}>{
          this.props.messages.map((msg, i) => {
            const colorClass = i % 2 ? " bg-light" : "";
            return (
              <ListGroupItem key={msg.id} className={"p-1" + colorClass}>
                <span style={{marginRight: "0.3em", fontWeight: "bold"}}>{msg.sender}</span>
                <span>{msg.text}</span>
              </ListGroupItem>
            );
          })
        }
        <div ref={el => {
          if (el) {
            this.scrollDummyElement = el;
          }
        }}></div>
        </ListGroup>
        <form className="messageInput" onSubmit={this.handleSubmit}>
          <Input placeholder="Say something..." value={this.state.inputValue} onChange={this.handleInputChange} />
        </form>
      </div>
    );
  }
}
