import RegularButton from './RegularButton'
import Select from './Select'

export default function Form({ handleSubmit, handleChange }) {
    return (
        <div className="form-container">
            <p className="p--regular">
                Customize the game by selecting an emoji category and a number of memory cards.
            </p>
            <form className="wrapper">
                <Select handleChange={handleChange} />
                {
                    // <div className="form__inner-wrapper">
                    //     <label htmlFor="category">Select an emoji category</label>
                    //     <select
                    //         name="category"
                    //         id="category"
                    //         onChange={handleChange}
                    //     >
                    //         <option value="animals-and-nature">Animals and nature</option>
                    //         <option value="food-and-drink">Food and drink</option>
                    //         <option value="travel-and-places">Travel and places</option>
                    //         <option value="objects">Objects</option>
                    //         <option value="symbols">Symbols</option>
                    //     </select>
                    // </div>
                    // <div className="form__inner-wrapper">
                    //     <label htmlFor="number">Select the number of memory cards</label>
                    //     <select
                    //         name="number"
                    //         id="number"
                    //         onChange={handleChange}
                    //     >
                    //         <option value="10">10</option>
                    //         <option value="20">20</option>
                    //         <option value="30">30</option>
                    //         <option value="40">40</option>
                    //         <option value="50">50</option>
                    //     </select>
                    // </div>
                }
                <RegularButton handleClick={handleSubmit}>
                    Start Game
                </RegularButton>
            </form>
        </div>
    )
}