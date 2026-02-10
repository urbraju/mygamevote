import React from 'react';
import renderer from 'react-test-renderer';

import { Text } from 'react-native';

describe('App', () => {
    it('has 1 child', () => {
        const tree = renderer.create(<Text>Hello World</Text>).toJSON();
        // @ts-ignore
        expect(tree.children.length).toBe(1);
        expect(tree).toMatchSnapshot();
    });
});
