import { Route } from "react-router-dom";
import Start from "./components/Start";
import Racko from "./components/Racko";
const App = () => {
  return (
    <div className='App'>
      <Route path='/' exact component={Start} />
      <Route path='/racko' component={Racko} />
    </div>
  );
};

export default App;
