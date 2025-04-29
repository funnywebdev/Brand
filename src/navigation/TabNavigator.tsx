import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomNavigation, Text, Appbar} from 'react-native-paper';
import RecordsScreen from '../screens/RecordsScreen';
import SecondTabScreen from '../screens/SecondTabScreen';

const TabNavigator = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    {
      key: 'records',
      title: 'Records',
      focusedIcon: 'database',
      unfocusedIcon: 'database-outline',
    },
    {
      key: 'second',
      title: 'JSON Files',
      focusedIcon: 'file-document',
      unfocusedIcon: 'file-document-outline',
    },
  ]);

  const renderScene = BottomNavigation.SceneMap({
    records: RecordsScreen,
    second: SecondTabScreen,
  });

  // Reference to the current active screen
  const recordsScreenRef = React.useRef<any>(null);

  const handleRefresh = () => {
    // If we're on the records tab and have a reference to the screen, call its onRefresh method
    if (index === 0 && recordsScreenRef.current?.onRefresh) {
      recordsScreenRef.current.onRefresh();
    }
  };

  // Update header based on active tab
  const renderHeader = () => {
    let title = '';
    let actions = null;
    
    if (index === 0) {
      title = 'Brand Records';
      actions = <Appbar.Action icon="refresh" onPress={handleRefresh} />;
    } else {
      title = 'JSON File Manager';
    }
    
    return (
      <Appbar.Header>
        <Appbar.Content title={title} />
        {actions}
      </Appbar.Header>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <BottomNavigation
        navigationState={{index, routes}}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={styles.bottomBar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomBar: {
    backgroundColor: 'white',
  },
});

export default TabNavigator;
