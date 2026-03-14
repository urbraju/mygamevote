const React = require('react');
const View = require('react-native').View;

const IconMock = (props) => React.createElement(View, { ...props, testID: 'icon-mock' });

module.exports = {
    Ionicons: IconMock,
    MaterialIcons: IconMock,
    FontAwesome: IconMock,
    MaterialCommunityIcons: IconMock,
    Feather: IconMock,
    SimpleLineIcons: IconMock,
    // Add others as needed
};
