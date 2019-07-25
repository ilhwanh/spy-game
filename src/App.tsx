import * as React from 'react'
import { render } from 'react-dom'
import { Route, Switch, BrowserRouter } from 'react-router-dom'
import * as api from './api'
import { Room } from './Room'
import Exception from './Exception'

class App extends React.Component {
  state = {
    page: "home",
    userId: null,
    roomKey: "",
    roomKeyInput: "",
    name: ""
  }

  onClickMakeRoom = async () => {
    this.setState({ page: "making-room" })

    const response1 = await api.postRequest("make-room", {})
    if (!response1['success']) {
      this.onError()
      return
    }
    const roomKey = response1['payload']['roomKey']

    const response2 = await api.postRequest("join-room", { roomKey: roomKey, name: this.state.name })
    if (!response2['success']) {
      this.onError()
      return
    }
    const userId = response2['payload']['userId']

    this.setState({ page: "room", userId: userId, roomKey: roomKey })
  }

  onClickJoinRoom = async () => {
    this.setState({ page: "joining-room" })
    const response1 = await api.postRequest("join-room", { roomKey: this.state.roomKeyInput, name: this.state.name })
    if (!response1['success']) {
      this.setState({ page: "home"})
      return
    }
    this.setState({ page: "room", userId: response1['payload']['userId'], roomKey: this.state.roomKeyInput })
  }

  onChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ name: e.target.value })
  }

  checkName = () => {
    return this.state.name !== "" && this.state.name.length <= 20
  }

  onChangeJoinRoomNameKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ roomKeyInput: e.target.value.toUpperCase() })
  }

  onSubmitJoinRoomName = async (e: React.MouseEvent<HTMLInputElement, MouseEvent>) => {
    
  }

  onRoomQuit = () => {
    this.setState({ page: "home", userId: null, roomKey: null })
  }

  onError = () => {
    this.setState({ page: "exception" })
  }

  render = () => {
    if (this.state.page === "home") {
      return (
        <div className="row">
          <div className="col-12 text-center mt-5">
            <h1><strong>스파이게임</strong></h1>
          </div>
          <div className="col-12 text-center mt-3">
            <div className="input-group mb-3 w-100">
              <div className="input-group-prepend">
                <span className="input-group-text" id="basic-addon1">이름</span>
              </div>
              <input
                type="text"
                className="form-control"
                aria-label="Username"
                aria-describedby="basic-addon1"
                onChange={this.onChangeName}
              />
            </div>
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <span className="input-group-text" id="basic-addon2">코드</span>
              </div>
              <input
                type="text"
                className="form-control"
                aria-label="Roomcode"
                aria-describedby="basic-addon2"
                onChange={this.onChangeJoinRoomNameKey}
              />
            </div>
          </div>
          <div className="col-12 text-center mt-3">
            <button
              disabled={!this.checkName()}
              className="btn btn-primary"
              onClick={this.state.roomKeyInput === "" ? this.onClickMakeRoom : this.onClickJoinRoom}
            >
              {this.state.roomKeyInput === "" ? "방 만들기" : "방 입장"}
            </button>
          </div>
        </div>
      )
    }
    else if (this.state.page === "making-room") {
      return (
        <div>
          방 만드는 중
        </div>
      )
    }
    else if (this.state.page === "joining-room") {
      return (
        <div>
          방 참여 중
        </div>
      )
    }
    else if (this.state.page === "room") {
      return (
        <Room
          userId={this.state.userId}
          roomKey={this.state.roomKey}
          onQuit={this.onRoomQuit}
          onError={this.onError}
        />
      )
    }
    else if (this.state.page === "exception") {
      return (
        <Exception/>
      )
    }
  }
}

render(<App/>, document.getElementById('main'));