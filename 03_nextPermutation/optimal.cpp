#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
  void rev(vector<int> &arr, int startIdx, int endIdx) {
    while (startIdx < endIdx) {
      swap(arr[startIdx], arr[endIdx]);
      startIdx++;
      endIdx--;
    }
  }

  void solve(vector<int> &arr) {
    int index = -1;
    for (int i = arr.size() - 1; i >= 0; i--) {
      if (arr[i] > arr[i - 1]) {
        index = i - 1;
        break;
      }
    }

    if (index == -1) {
      rev(arr, 0, arr.size() - 1);
      return;
    }

    for (int i = arr.size() - 1; i >= 0; i--) {
      if (arr[i] > arr[index]) {
        swap(arr[i], arr[index]);
        break;
      }
    }

    rev(arr, index + 1, arr.size() - 1);
  }
};

void printArr(vector<int> &arr) {
  for (size_t i = 0; i < arr.size(); ++i) {
    cout << arr[i] << " ";
  }
  cout << endl;
}

int main() {
  Solution sol;

  vector<int> a = {2, 1, 5, 4, 3, 0, 0};
  printArr(a);
  sol.solve(a);
  printArr(a);

  return 0;
}
