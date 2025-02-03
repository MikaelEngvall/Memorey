import { decodeEntity } from 'html-entities'

export default function EmojiButton({ emoji, handleClick, selectedCardEntry, matchedCardEntry, index }) {
    return (
        <button 
            className={`btn btn--emoji ${selectedCardEntry ? 'btn--emoji__back--selected' : ''} ${matchedCardEntry ? 'btn--emoji__back--matched' : ''}`}
            onClick={handleClick}
            disabled={matchedCardEntry}
        >
            <span className={`btn--emoji__front ${selectedCardEntry ? 'btn--emoji__front--selected' : ''}`}>
                {emoji.htmlCode}
            </span>
            <span className={`btn--emoji__back ${selectedCardEntry ? 'btn--emoji__back--selected' : ''} ${matchedCardEntry ? 'btn--emoji__back--matched' : ''}`}>
                {emoji.htmlCode}
            </span>
        </button>
    );
}