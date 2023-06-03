const RECORDS_STORAGE_KEY = '@user_records';

jQuery(document).ready(function() {
    const $welcomeScreen = jQuery('.welcome-message');
    const $statsItems = jQuery('.stats__items');
    const $startGameButton = jQuery('.start-game-button');
    const $recordForm = jQuery('.record-form');

    const $gameArea = jQuery('.game-area');
    const $gameStats = jQuery('.game-area__stats');
    const $gameAreaCards = jQuery('.game-area__cards');

    const $game = jQuery('.game');
    const $stats = jQuery('.stats');

    // Show up welcome screen with animation
    $welcomeScreen.fadeIn(150).css('display', 'flex');

    const stats = {
        init: () => {
            let data = localStorage.getItem(RECORDS_STORAGE_KEY);

            if(data) {
                try {
                    stats.paint(JSON.parse(data));
                } catch(e) {
                    console.error(e);
                    stats.paintNotFound();
                }
            } else {
                stats.paintNotFound();
            }

            stats.bindEvents();
        },

        write: (name, rounds) => {
            let data = localStorage.getItem(RECORDS_STORAGE_KEY);

            try {
                data = JSON.parse(data || '');

                data = [...data, { name, rounds }];
            } catch(e) {
                data = [{ name, rounds }];
            }

            localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(data));
        },
        paint: (records) => {
            $statsItems.html('');

            let prevScore = null,
                position = 1;

            records
                .sort((a, b) => a.rounds - b.rounds)
                .filter((_, i) => i < 10)
                .map((r) => {
                    if(prevScore && r.rounds !== prevScore) {
                        position ++;
                    }

                    prevScore = r.rounds;

                    return {
                        ...r,
                        position
                    };
                })
                .forEach(stats.renderItem);
        },
        renderItem: ({ name, rounds, position }) => {
            const $element = jQuery('<div />');

            $element.addClass('stats__items--item');
            $element.html(`
                <span>${position}.</span>
                <b>${name}</b>
                <small>${rounds}</small>
            `);

            $statsItems.append($element);
        },

        paintNotFound: () => {
            const $element = jQuery('<div />');

            $element.addClass('stats__items--error');
            $element.html("No records were registered.");

            $statsItems.find('.stats__items--error').detach();
            $statsItems.append($element);
        },

        bindEvents: () => {
            $recordForm.find('.submit-record').off('click');

            $recordForm.find('#record-name').on('keyup', function(e) {
                // Hnndle click on enter in form, to submit record
                if(e.key === 'Enter') {
                    stats.submitRecord();
                }
            });

            $recordForm.find('.submit-record').click(stats.submitRecord);
        },

        submitRecord: () => {
            const $nameField = $recordForm.find('#record-name');
            const userName = $nameField.val();

            // Username is important
            if(!userName) {
                alert('Provide your name in user field');
                return false;
            }

            stats.write(userName, game.rounds);
            stats.init();

            $nameField.val('');
            $recordForm.fadeOut(300);

            $game.hide();
            $stats.fadeIn(300);
        }
    };

    // Game logic. Fully configurable

    const game = {
        rounds: 0,
        maxPairs: 20,
        maxImages: 10,
        maxOpenedCards: 2,
        maxRounds: 0,
        cards: [],

        // Start the routine of game. Draw everything
        start: () => {
            game.rounds = 0;
            game.maxOpenedCards = game.maxPairs/game.maxImages;
            game.maxRounds = game.maxImages;

            game.generateCards();
            game.draw();

            $gameArea.fadeIn(300);
        },

        // End game routine and show records window
        end: () => {
            $recordForm.find('.record-rounds').html(game.rounds);
            $recordForm.fadeIn(300).css('display', 'flex');
        },

        generateCards: () => {
            const maxImagesPerPair = game.maxPairs/game.maxImages;
            let allCards = new Array(game.maxPairs)
                .fill(null)
                .map((_, i) => ({
                    position: i
                }));

            let imageID = 1;
            let pairID = 1;

            for(let i = 1; i <= game.maxImages; i++) {
                for(let j = 0; j < maxImagesPerPair; j++) {
                    const availablePositions = allCards.filter((c) => !c.id),
                        randomPosition = Math.floor(Math.random() * ((availablePositions.length - 1) + 1));

                    const selectedPosition = availablePositions[randomPosition];

                    allCards[selectedPosition.position] = {
                        id: imageID,
                        pair: pairID,
                        imageNumber: i,
                        position: selectedPosition.position
                    };

                    imageID ++;
                }

                pairID ++;
            }

            game.cards = allCards.sort((a, b) => a.position - b.position);
        },

        // Main drawing routine. Draw stats and pairs
        draw: () => {
            game.drawStats();
            game.drawCards();
        },

        drawStats: () => {
            $gameStats.find('.game-area__stats--left').html(`
                <b>Rounds:</b>
                <span>${game.rounds}</span>
            `);

            return true;
        },
        
        drawCards: () => {
            $gameAreaCards.html('');
            game.cards.forEach(game.renderCard);
        },

        renderCard: ({ id, imageNumber }) => {
            const $pair = jQuery('<div>');

            $pair.addClass('pair__card--wrapper');
            $pair.html(`
                <div class="pair__card" data-id="${id}">
                    <div class="pair__card--front"></div>
                    <div class="pair__card--back">
                        <img src="./images/memo-${imageNumber.toString().padStart(2, '0')}.jpg" />
                    </div>
                </div>
            `);

            game.bindCardEvent($pair);
            $gameAreaCards.append($pair);
        },

        showCard: ($card) => {
            if($card.hasClass('disabled')) return false;
            if($gameAreaCards.find('.pair__card.active').length === game.maxOpenedCards) return false;

            $card.find('.pair__card').addClass('active');

            game.checkConditions();
        },

        // Binds event to card element. Click on card makes it open
        bindCardEvent: ($element) => {
            $element.click(function() {
                game.showCard($element);
            });
        },

        // Main business-logic of the game. Checks the pairs and handles the process of the game
        checkConditions: () => {
            const $openedCards = [...$gameAreaCards.find('.pair__card.active')];
            // If player did not opened `maxOpenedCards`. By defaults its value is 2
            if($openedCards.length !== game.maxOpenedCards) return false;

            game.rounds ++;
            // Redraw stats after increasing rounds count
            game.drawStats();

            let pairIDs = [];

            // Push each opened card into pairIDs array
            $openedCards.forEach(($card) => {
                const cardID = parseInt(jQuery($card).attr('data-id'));
                const cardObject = game.cards.find((c) => c.id === cardID);

                if(cardObject) {
                    pairIDs.push(cardObject.pair);
                }
            });

            let pairID = pairIDs[0];

            if(pairIDs.some((id) => id !== pairID)) {
                setTimeout(() => {
                    $openedCards.forEach(($c) => jQuery($c).removeClass('active'));
                }, 600);

                return false;
            }

            $openedCards.forEach(($card) => {
                jQuery($card).addClass('disabled');
                jQuery($card).removeClass('active');
            });

            // End game when disabled cards and active cards equals
            const disabledCards = $gameAreaCards.find('.pair__card.disabled').length;
            const activeCards = $gameAreaCards.find('.pair__card').length;

            if(disabledCards === activeCards) {
                game.end();
            }

            return true;
        }
    };

    stats.init();

    // Handle click on start game button and start game
    $startGameButton.click(function() {
        $game.show();
        $welcomeScreen.hide();
        $stats.hide();

        game.start();
    });

    jQuery('.restart-button').click(function() {
        $gameArea.hide();
        $welcomeScreen.show();
        $stats.hide();

        $game.fadeIn(300);
    });
});
