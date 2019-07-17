import * as React from 'react'
import * as api from './api'

export class Room extends React.Component {
  props: {
    userId: string,
    roomKey: string,
    onQuit: () => void,
    onError: () => void
  }

  state = {
    quitButtonEnabled: true
  }

  stepInterval = 500
  heartbeatHandler: NodeJS.Timeout = null

  onClickQuit = async () => {
    this.setState({ quitButtonEnabled: false })
    await api.postRequest("quit-room", { userId: this.props.userId, roomKey: this.props.roomKey })
    clearTimeout(this.heartbeatHandler)
    this.props.onQuit()
  }

  constructor(props) {
    super(props)
    this.heartbeat()
  }

  heartbeat = async () => {
    await api.postRequest("heartbeat", { userId: this.props.userId, roomKey: this.props.roomKey })
    this.heartbeatHandler = setTimeout(this.heartbeat, this.stepInterval)
  }

  render = () => {
    return (
      <div>
        Hello
        {this.props.userId}
        {this.props.roomKey}
        <button onClick={this.onClickQuit} disabled={!this.state.quitButtonEnabled}>
          나가기
        </button>
      </div>
    )
  }
}
