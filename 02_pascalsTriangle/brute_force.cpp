#include <iostream>
#include <vector>
using namespace std;

// 2 loops Outer and inner
// first loop loops over 0 - < n 
// second loop loops over 0 - <= i

vector<vector<int>> solve(int n) {
  vector<vector<int>> arr(n);

  for(int i = 0; i < n; ++i) {
    if(i == 0) {
      arr[i].emplace_back(1);
      continue;
    }
    for(int j = 0; j <= i; ++j) {
      if(j == 0 || j == i) {
        arr[i].push_back(1);
        continue;
      }
      arr[i].push_back(arr[i-1][j-1]+arr[i-1][j]);
    }
  }

  return arr;
}

void printArr(vector<vector<int>> &a) {
  for(int i = 0; i < a.size(); ++i) {
   for(int j = 0; j < a[i].size(); j++) {
      cout << a[i][j] << " ";
    }
    cout << endl;
  }
}

int main() {
  vector<vector<int>> result = solve(5);
  printArr(result);
  return 0;
}
